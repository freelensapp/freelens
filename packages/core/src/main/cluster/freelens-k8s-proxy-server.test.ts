/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { Agent } from "node:https";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../common/cluster/cluster";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import spawnInjectable from "../child-process/spawn.injectable";
import freelensK8sProxyCertificateInjectable from "../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import waitUntilPortIsUsedInjectable from "../freelens-k8s-proxy/wait-until-port-is-used/wait-until-port-is-used.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import freelensK8sProxyServerInjectable from "./freelens-k8s-proxy-server.injectable";
import type { ChildProcess } from "node:child_process";

import type { Mock } from "vitest";

import type { FreelensK8sProxyServer } from "./freelens-k8s-proxy-server.injectable";

interface FakeProxyProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: Mock;
}

describe("freelens-k8s-proxy server", () => {
  let spawnMock: Mock;
  let processes: FakeProxyProcess[];
  let freelensK8sProxyServer: FreelensK8sProxyServer;
  let clusterApiUrl: () => Promise<URL>;

  const portOf = async (isLongRunningRequest?: boolean) => {
    const { target } = await freelensK8sProxyServer.getApiTarget(isLongRunningRequest);

    return (target as URL).port;
  };

  beforeEach(() => {
    const di = getDiForUnitTesting();

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

    freelensK8sProxyServer = di.inject(freelensK8sProxyServerInjectable, cluster);
  });

  afterEach(() => {
    freelensK8sProxyServer.stop();
  });

  it.each([false, true])(
    "shares one keep-alive agent when the first request is long-running: %s",
    async (longFirst) => {
      const first = await freelensK8sProxyServer.getApiTarget(longFirst);
      const second = await freelensK8sProxyServer.getApiTarget(!longFirst);
      const normal = longFirst ? second : first;
      const watch = longFirst ? first : second;
      const agent = normal.agent as Agent;

      expect(agent).toBeInstanceOf(Agent);
      expect(watch.agent).toBe(agent);
      expect(agent.options.keepAlive).toBe(true);
      expect(agent.maxSockets).toBe(Infinity);
      expect(agent.maxFreeSockets).toBe(16);
      expect(agent.options.timeout).toBeUndefined();
      expect(normal).toEqual({
        agent,
        target: new URL("https://127.0.0.1:9001/0001020304050607"),
        ca: "some-cert",
        changeOrigin: true,
        timeout: 30_000,
        secure: true,
        headers: { Host: "192.168.64.3" },
      });
      expect(watch).toEqual({ ...normal, timeout: 4 * 60 * 60 * 1000 });
      expect(await freelensK8sProxyServer.getApiTarget()).toBe(normal);

      const nextWatch = await freelensK8sProxyServer.getApiTarget(true);

      expect(nextWatch).not.toBe(watch);
      expect(nextWatch.agent).toBe(agent);
    },
  );

  it("destroys the pool on restart and destroys its replacement only once on repeated stop", async () => {
    const first = await freelensK8sProxyServer.getApiTarget();
    const destroy = vi.spyOn(first.agent as Agent, "destroy");

    await freelensK8sProxyServer.restart();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(processes[0].kill).toHaveBeenCalledTimes(1);

    const next = await freelensK8sProxyServer.getApiTarget();

    expect(next.agent).toBeInstanceOf(Agent);
    expect(next.agent).not.toBe(first.agent);

    const destroyNext = vi.spyOn(next.agent as Agent, "destroy");

    freelensK8sProxyServer.stop();
    freelensK8sProxyServer.stop();

    expect(destroyNext).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(processes[1].kill).toHaveBeenCalledTimes(1);
  });

  it("reuses the target of a short request while the proxy runs", async () => {
    const first = await freelensK8sProxyServer.getApiTarget();
    const second = await freelensK8sProxyServer.getApiTarget();

    expect(second).toBe(first);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("gives the URL of the API server that its last target forwards to", async () => {
    expect(freelensK8sProxyServer.apiUrl).toBeUndefined();

    await freelensK8sProxyServer.getApiTarget();
    expect(freelensK8sProxyServer.apiUrl?.href).toBe("https://192.168.64.3:8443/");

    clusterApiUrl = async () => new URL("https://some-rancher/k8s/clusters/local");
    await freelensK8sProxyServer.getApiTarget(true);
    expect(freelensK8sProxyServer.apiUrl?.href).toBe("https://some-rancher/k8s/clusters/local");
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
      const first = await freelensK8sProxyServer.getApiTarget();
      const second = await freelensK8sProxyServer.getApiTarget();

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
      ["ensureRunning()", () => freelensK8sProxyServer.ensureRunning()],
      ["ensureFreelensK8sProxyUrl()", () => freelensK8sProxyServer.ensureFreelensK8sProxyUrl()],
    ])("gives the next short request the target of a proxy that %s has started", async (_name, startProxy) => {
      await startProxy();

      expect(await portOf()).toBe("9002");
      expect(await portOf()).toBe("9002");
      expect(spawnMock).toHaveBeenCalledTimes(2);
    });
  });

  it("starts a new proxy for a short request after stop()", async () => {
    expect(await portOf()).toBe("9001");

    freelensK8sProxyServer.stop();

    expect(processes[0].kill).toHaveBeenCalled();
    expect(await portOf()).toBe("9002");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("spawns no proxy for a short request stopped while the API URL is pending", async () => {
    const pendingApiUrls: ((url: URL) => void)[] = [];

    clusterApiUrl = () => new Promise((resolve) => pendingApiUrls.push(resolve));

    const target = freelensK8sProxyServer.getApiTarget();

    freelensK8sProxyServer.stop();

    for (const resolve of pendingApiUrls) {
      resolve(new URL("https://192.168.64.3:8443"));
    }

    await expect(target).rejects.toThrow("freelens-k8s-proxy was stopped before it was ready");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("starts a new proxy on restart() and gives short requests its target", async () => {
    expect(await portOf()).toBe("9001");

    await freelensK8sProxyServer.restart();

    expect(processes[0].kill).toHaveBeenCalled();
    expect(await portOf()).toBe("9002");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });
});
