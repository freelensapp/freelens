/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../common/cluster/cluster";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import spawnInjectable from "../child-process/spawn.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import createFreelensK8sProxyInjectable from "./create-freelens-k8s-proxy.injectable";
import freelensK8sProxyCertificateInjectable from "./freelens-k8s-proxy-certificate.injectable";
import waitUntilPortIsUsedInjectable from "./wait-until-port-is-used/wait-until-port-is-used.injectable";
import type { ChildProcess } from "node:child_process";

import type { Mock } from "vitest";

import type { FreelensK8sProxy } from "./create-freelens-k8s-proxy.injectable";

interface FakeProxyProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: Mock;
}

/**
 * What a spawned process does once its caller has subscribed to it.
 */
type Behaviour = (proxyProcess: FakeProxyProcess, port: number) => void;

const serves: Behaviour = (proxyProcess, port) =>
  proxyProcess.stdout.emit("data", `Starting to serve on 127.0.0.1:${port}`);

// As freelens-k8s-proxy does with a kubeconfig whose server is not a URL
const exitsWithBrokenKubeconfig: Behaviour = (proxyProcess) => {
  proxyProcess.stderr.emit("data", 'failed to initialize proxy handlerparse "::not-a-url/": missing protocol scheme');
  proxyProcess.emit("exit", 255, null);
};

const printsNothing: Behaviour = () => {};

describe("starting freelens-k8s-proxy", () => {
  let spawnMock: Mock;
  let broadcastMessageMock: Mock;
  let clusterApiUrl: Mock;
  let processes: FakeProxyProcess[];
  let behaviours: Behaviour[];
  let freelensK8sProxy: FreelensK8sProxy;

  /**
   * Starts the proxy, and settles to what the start settled to, without
   * leaving a rejection unhandled while the test advances time.
   */
  const run = () => {
    let outcome: { resolved: true } | { rejected: Error } | undefined;

    const settled = freelensK8sProxy.run().then(
      () => (outcome = { resolved: true }),
      (error: Error) => (outcome = { rejected: error }),
    );

    return { settled, outcome: () => outcome };
  };

  beforeEach(() => {
    vi.useFakeTimers();

    const di = getDiForUnitTesting();

    processes = [];
    behaviours = [];
    spawnMock = vi.fn(() => {
      const proxyProcess = Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        kill: vi.fn(),
      });
      const port = 9000 + processes.push(proxyProcess);
      const behaviour = behaviours.shift() ?? serves;

      queueMicrotask(() => behaviour(proxyProcess, port));

      return proxyProcess as unknown as ChildProcess;
    });
    broadcastMessageMock = vi.fn();
    clusterApiUrl = vi.fn(async () => new URL("https://192.168.64.3:8443"));

    di.override(spawnInjectable, () => spawnMock as any);
    di.override(waitUntilPortIsUsedInjectable, () => async () => {});
    di.override(broadcastMessageInjectable, () => broadcastMessageMock);
    di.override(clusterApiUrlInjectable, () => clusterApiUrl);
    di.override(freelensK8sProxyCertificateInjectable, () =>
      Promise.resolve({ cert: "some-cert", private: "some-private-key", public: "some-public-key" }),
    );

    const cluster = new Cluster({
      id: "some-cluster-id",
      kubeConfigPath: "/some/kube-config",
      contextName: "some-context-name",
    });

    freelensK8sProxy = di.inject(createFreelensK8sProxyInjectable, cluster)({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves once a proxy serves", async () => {
    await freelensK8sProxy.run();

    expect(freelensK8sProxy.port).toBe(9001);
    expect(freelensK8sProxy.isRunning).toBe(true);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("starts the proxy subcommand, with the cluster and the certificate in its environment", async () => {
    await freelensK8sProxy.run();

    expect(spawnMock).toHaveBeenCalledWith(expect.any(String), ["proxy"], {
      env: {
        KUBECONFIG: "/some/kube-config",
        FREELENS_PROXY_CONTEXT: "some-context-name",
        FREELENS_PROXY_API_PREFIX: freelensK8sProxy.apiPrefix,
        FREELENS_PROXY_CERT: "some-cert",
        FREELENS_PROXY_KEY: "some-private-key",
      },
      cwd: "/some",
    });
  });

  describe("when the proxy exits before it prints its port", () => {
    beforeEach(() => {
      behaviours = [exitsWithBrokenKubeconfig, exitsWithBrokenKubeconfig];
    });

    it("rejects at once, with the exit code and what the proxy wrote to stderr", async () => {
      const start = run();

      await vi.advanceTimersByTimeAsync(0);

      expect(start.outcome()).toEqual({
        rejected: new Error(
          'freelens-k8s-proxy exited with code 255 before it was ready: failed to initialize proxy handlerparse "::not-a-url/": missing protocol scheme',
        ),
      });
      expect(freelensK8sProxy.isRunning).toBe(false);
    });

    it("does not restart it, then or later", async () => {
      await run().settled;
      await vi.advanceTimersByTimeAsync(120_000);

      expect(spawnMock).toHaveBeenCalledTimes(1);
    });

    it("starts a new proxy on the next run", async () => {
      await run().settled;

      const next = run();

      await next.settled;

      expect(spawnMock).toHaveBeenCalledTimes(2);
      expect(next.outcome()).toEqual({ rejected: expect.any(Error) });
    });
  });

  it("rejects at once when the proxy cannot be spawned", async () => {
    behaviours = [(proxyProcess) => proxyProcess.emit("error", new Error("spawn freelens-k8s-proxy ENOENT"))];

    const start = run();

    await vi.advanceTimersByTimeAsync(0);

    expect(start.outcome()).toEqual({
      rejected: new Error("freelens-k8s-proxy failed before it was ready: spawn freelens-k8s-proxy ENOENT"),
    });
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("rejects without spawning when the API URL of the cluster cannot be read", async () => {
    clusterApiUrl.mockRejectedValue(new TypeError("Invalid URL"));

    const start = run();

    await start.settled;

    expect(start.outcome()).toEqual({ rejected: new TypeError("Invalid URL") });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  describe("when the proxy prints no port", () => {
    it("restarts it after a second, and resolves once a later one serves", async () => {
      behaviours = [printsNothing];

      const start = run();

      // getPortFromStream waits 15 s for the port
      await vi.advanceTimersByTimeAsync(15_000);

      expect(processes[0].kill).toHaveBeenCalled();
      expect(spawnMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_000);

      expect(spawnMock).toHaveBeenCalledTimes(2);
      expect(start.outcome()).toEqual({ resolved: true });
      expect(freelensK8sProxy.port).toBe(9002);
    });

    it("gives up after three proxies, with a growing delay, and rejects", async () => {
      behaviours = [printsNothing, printsNothing, printsNothing];

      const start = run();

      await vi.advanceTimersByTimeAsync(15_000 + 1_000);
      expect(spawnMock).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(15_000 + 1_999);
      expect(spawnMock).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1);
      expect(spawnMock).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(15_000);

      expect(start.outcome()).toEqual({
        rejected: new Error("freelens-k8s-proxy failed to start after 3 attempts: Proxy port can't be found"),
      });
      expect(processes.every((proxyProcess) => proxyProcess.kill.mock.calls.length === 1)).toBe(true);

      await vi.advanceTimersByTimeAsync(120_000);

      expect(spawnMock).toHaveBeenCalledTimes(3);
    });

    it("rejects at once when a restarted proxy exits before it prints its port", async () => {
      behaviours = [printsNothing, exitsWithBrokenKubeconfig];

      const start = run();

      await vi.advanceTimersByTimeAsync(15_000 + 1_000);

      expect(spawnMock).toHaveBeenCalledTimes(2);
      expect(start.outcome()).toEqual({
        rejected: expect.objectContaining({ message: expect.stringContaining("255") }),
      });
    });
  });

  it("rejects at once and does not restart when the proxy is stopped while it starts", async () => {
    behaviours = [printsNothing];

    const start = run();

    await vi.advanceTimersByTimeAsync(5_000);
    freelensK8sProxy.exit();
    await vi.advanceTimersByTimeAsync(0);

    expect(start.outcome()).toEqual({ rejected: new Error("freelens-k8s-proxy was stopped before it was ready") });
    expect(processes[0].kill).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(120_000);

    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("rejects at once and does not restart when the proxy is stopped while it waits to restart", async () => {
    behaviours = [printsNothing];

    const start = run();

    await vi.advanceTimersByTimeAsync(15_000 + 500);
    freelensK8sProxy.exit();
    await vi.advanceTimersByTimeAsync(0);

    expect(start.outcome()).toEqual({ rejected: new Error("freelens-k8s-proxy was stopped before it was ready") });

    await vi.advanceTimersByTimeAsync(120_000);

    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("does not restart a proxy that exits after it has served, and starts a new one on the next run", async () => {
    await freelensK8sProxy.run();

    processes[0].emit("exit", 1, null);

    expect(freelensK8sProxy.isRunning).toBe(false);

    await vi.advanceTimersByTimeAsync(120_000);

    expect(spawnMock).toHaveBeenCalledTimes(1);

    await freelensK8sProxy.run();

    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(freelensK8sProxy.port).toBe(9002);
  });
});
