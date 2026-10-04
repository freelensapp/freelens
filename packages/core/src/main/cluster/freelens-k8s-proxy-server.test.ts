/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    di.override(clusterApiUrlInjectable, () => async () => new URL("https://192.168.64.3:8443"));
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

  it("reuses the target of a short request while the proxy runs", async () => {
    const first = await freelensK8sProxyServer.getApiTarget();
    const second = await freelensK8sProxyServer.getApiTarget();

    expect(second).toBe(first);
    expect(spawnMock).toHaveBeenCalledTimes(1);
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
  });

  it("starts a new proxy for a short request after stop()", async () => {
    expect(await portOf()).toBe("9001");

    freelensK8sProxyServer.stop();

    expect(processes[0].kill).toHaveBeenCalled();
    expect(await portOf()).toBe("9002");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("starts a new proxy on restart() and gives short requests its target", async () => {
    expect(await portOf()).toBe("9001");

    await freelensK8sProxyServer.restart();

    expect(processes[0].kill).toHaveBeenCalled();
    expect(await portOf()).toBe("9002");
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });
});
