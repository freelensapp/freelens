/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { fetch as undiciFetch } from "undici";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../common/cluster/cluster";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import spawnInjectable from "../child-process/spawn.injectable";
import freelensK8sProxyCertificateInjectable from "../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import waitUntilPortIsUsedInjectable from "../freelens-k8s-proxy/wait-until-port-is-used/wait-until-port-is-used.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import freelensK8sProxyManagerInjectable from "./freelens-k8s-proxy-manager.injectable";
import { createFreelensK8sProxyAgent } from "./freelens-k8s-proxy-target";
import type { ChildProcess } from "node:child_process";

import type { ServerOptions } from "http-proxy-3";
import type { Agent, Dispatcher } from "undici";
import type { Mock } from "vitest";

import type { FreelensK8sProxyManager } from "./freelens-k8s-proxy-manager.injectable";

vi.mock("./freelens-k8s-proxy-target", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./freelens-k8s-proxy-target")>();

  return { ...actual, createFreelensK8sProxyAgent: vi.fn(actual.createFreelensK8sProxyAgent) };
});

interface FakeProxyProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: Mock;
}

const dispatcherOf = (options: ServerOptions) =>
  (options.fetchOptions?.requestOptions as { dispatcher?: Dispatcher } | undefined)?.dispatcher;

describe("freelens-k8s-proxy manager", () => {
  let spawnMock: Mock;
  let processes: FakeProxyProcess[];
  let freelensK8sProxyManager: FreelensK8sProxyManager;
  let clusterApiUrl: () => Promise<URL>;
  const createAgent = vi.mocked(createFreelensK8sProxyAgent);

  /**
   * The pool that the `index`th call created.
   */
  const agentAt = (index: number) => createAgent.mock.results[index].value as Agent;

  const portOf = async (isLongRunningRequest?: boolean) => {
    const { target } = await freelensK8sProxyManager.getApiTarget(isLongRunningRequest);

    return (target as URL).port;
  };

  beforeEach(() => {
    const di = getDiForUnitTesting();

    createAgent.mockClear();

    processes = [];
    spawnMock = vi.fn(() => {
      const proxyProcess = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        kill: vi.fn(),
      });
      const port = 9000 + processes.push(proxyProcess);

      // The proxy reports its port once it listens, after the caller of
      // spawn has subscribed to its output.
      queueMicrotask(() => proxyProcess.stdout.emit("data", `Starting to serve on 127.0.0.1:${port}`));

      return proxyProcess as unknown as ChildProcess;
    });
    di.override(spawnInjectable, () => spawnMock as any);
    di.override(waitUntilPortIsUsedInjectable, () => async () => {});
    di.override(broadcastMessageInjectable, () => vi.fn());
    clusterApiUrl = async () => new URL("https://192.168.64.3:8443");
    di.override(clusterApiUrlInjectable, () => () => clusterApiUrl());
    di.override(freelensK8sProxyCertificateInjectable, () =>
      Promise.resolve({ cert: "some-cert", private: "some-private-key", public: "some-public-key" }),
    );

    const cluster = new Cluster({
      id: "some-cluster-id",
      kubeConfigPath: "/some/kube-config",
      contextName: "some-context-name",
    });

    freelensK8sProxyManager = di.inject(freelensK8sProxyManagerInjectable, cluster);
  });

  afterEach(() => {
    freelensK8sProxyManager.stop();
  });

  it.each([false, true])(
    "shares one pool, which trusts the certificate of the proxy, when the first request is long-running: %s",
    async (longFirst) => {
      const first = await freelensK8sProxyManager.getApiTarget(longFirst);
      const second = await freelensK8sProxyManager.getApiTarget(!longFirst);
      const normal = longFirst ? second : first;
      const watch = longFirst ? first : second;
      const dispatcher = dispatcherOf(normal);

      expect(createAgent).toHaveBeenCalledTimes(1);
      expect(createAgent).toHaveBeenCalledWith("some-cert");
      expect(dispatcher).toBeDefined();
      expect(normal).toEqual({
        target: new URL("https://127.0.0.1:9001/0001020304050607"),
        timeout: 30_000,
        fetch: undiciFetch,
        fetchOptions: { requestOptions: { dispatcher, redirect: "manual" } },
      });
      expect(watch).toEqual({ ...normal, timeout: 4 * 60 * 60 * 1000 });
      expect(await freelensK8sProxyManager.getApiTarget()).toBe(normal);

      const nextWatch = await freelensK8sProxyManager.getApiTarget(true);

      expect(nextWatch).not.toBe(watch);
      expect(dispatcherOf(nextWatch)).toBe(dispatcher);
      expect(createAgent).toHaveBeenCalledTimes(1);
    },
  );

  it("destroys the pool on restart, gives the new proxy a new dispatcher, and destroys it only once on repeated stop", async () => {
    const first = await freelensK8sProxyManager.getApiTarget();

    await freelensK8sProxyManager.restart();

    expect(agentAt(0).destroyed).toBe(true);
    expect(processes[0].kill).toHaveBeenCalledTimes(1);

    const next = await freelensK8sProxyManager.getApiTarget();

    expect(createAgent).toHaveBeenCalledTimes(2);
    expect(agentAt(1).destroyed).toBe(false);
    expect(dispatcherOf(next)).toBeDefined();
    expect(dispatcherOf(next)).not.toBe(dispatcherOf(first));

    freelensK8sProxyManager.stop();

    expect(agentAt(1).destroyed).toBe(true);

    // undici's destroy() calls itself once more, so the spy goes on after the
    // first stop
    const destroyAgain = vi.spyOn(agentAt(1), "destroy");

    freelensK8sProxyManager.stop();

    expect(destroyAgain).not.toHaveBeenCalled();
    expect(processes[1].kill).toHaveBeenCalledTimes(1);
  });

  it("lets no request out through the dispatcher of a stopped proxy", async () => {
    const dispatcher = dispatcherOf(await freelensK8sProxyManager.getApiTarget());

    await freelensK8sProxyManager.restart();

    await expect(undiciFetch("https://127.0.0.1:9001/0001020304050607/api", { dispatcher })).rejects.toMatchObject({
      cause: { code: "UND_ERR_DESTROYED" },
    });
  });

  it("reuses the target of a short request while the proxy runs", async () => {
    const first = await freelensK8sProxyManager.getApiTarget();
    const second = await freelensK8sProxyManager.getApiTarget();

    expect(second).toBe(first);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("gives the URL of the API server that its last target forwards to", async () => {
    expect(freelensK8sProxyManager.apiUrl).toBeUndefined();

    const first = await freelensK8sProxyManager.getApiTarget();

    expect(freelensK8sProxyManager.apiUrl?.href).toBe("https://192.168.64.3:8443/");

    clusterApiUrl = async () => new URL("https://some-rancher/k8s/clusters/local");

    const next = await freelensK8sProxyManager.getApiTarget(true);

    expect(freelensK8sProxyManager.apiUrl?.href).toBe("https://some-rancher/k8s/clusters/local");
    // The same proxy process, so the same dispatcher, whatever the host
    expect(dispatcherOf(next)).toBe(dispatcherOf(first));
    expect(createAgent).toHaveBeenCalledTimes(1);
  });

  it("starts one proxy for concurrent short requests", async () => {
    const ports = await Promise.all([portOf(), portOf(), portOf()]);

    expect(ports).toEqual(["9001", "9001", "9001"]);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  describe("given the proxy has exited on its own after a short request", () => {
    beforeEach(async () => {
      expect(await portOf()).toBe("9001");

      processes[0].emit("exit", 1);
    });

    it("gives the next short request a target for a newly started proxy", async () => {
      expect(await portOf()).toBe("9002");
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });

    it("keeps reusing the target of the new proxy", async () => {
      const first = await freelensK8sProxyManager.getApiTarget();
      const second = await freelensK8sProxyManager.getApiTarget();

      expect(second).toBe(first);
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });

    it("starts one new proxy for concurrent short requests", async () => {
      const ports = await Promise.all([portOf(), portOf(), portOf()]);

      expect(ports).toEqual(["9002", "9002", "9002"]);
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });

    it("starts one new proxy for concurrent short and long requests", async () => {
      const ports = await Promise.all([portOf(), portOf(true), portOf()]);

      expect(ports).toEqual(["9002", "9002", "9002"]);
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["ensureRunning()", () => freelensK8sProxyManager.ensureRunning()],
      ["ensureFreelensK8sProxyUrl()", () => freelensK8sProxyManager.ensureFreelensK8sProxyUrl()],
    ])("gives the next short request the target of a proxy that %s has started", async (_name, startProxy) => {
      await startProxy();

      expect(await portOf()).toBe("9002");
      expect(await portOf()).toBe("9002");
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });
  });

  it("starts a new proxy for a short request after stop()", async () => {
    expect(await portOf()).toBe("9001");

    freelensK8sProxyManager.stop();

    expect(processes[0].kill).toHaveBeenCalled();
    expect(await portOf()).toBe("9002");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("spawns no proxy for a short request stopped while the API URL is pending", async () => {
    const pendingApiUrls: ((url: URL) => void)[] = [];

    clusterApiUrl = () => new Promise((resolve) => pendingApiUrls.push(resolve));

    const target = freelensK8sProxyManager.getApiTarget();

    freelensK8sProxyManager.stop();

    for (const resolve of pendingApiUrls) {
      resolve(new URL("https://192.168.64.3:8443"));
    }

    await expect(target).rejects.toThrow("freelens-k8s-proxy was stopped before it was ready");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("starts a new proxy on restart() and gives short requests its target", async () => {
    expect(await portOf()).toBe("9001");

    await freelensK8sProxyManager.restart();

    expect(processes[0].kill).toHaveBeenCalled();
    expect(await portOf()).toBe("9002");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });
});
