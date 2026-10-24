/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { computed } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import createKubeJsonApiForClusterInjectable from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import platformInjectable from "../../../common/vars/platform.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionStateInjectable } from "../../../features/vars/build-version/main/init.injectable";
import loadProxyKubeconfigInjectable from "../../cluster/load-proxy-kubeconfig.injectable";
import freelensProxyPortInjectable from "../../freelens-proxy/freelens-proxy-port.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../processes.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import openNodeShellSessionInjectable from "./open.injectable";

import type { KubeConfig, V1Pod } from "@kubernetes/client-node";
import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { MockedFunction } from "vitest";
import type WebSocket from "ws";

import type { CreateKubeApi } from "../../../common/k8s-api/create-kube-api.injectable";
import type { CreateKubeJsonApiForCluster } from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import type { KubeconfigManager } from "../../kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../../kubectl/kubectl";
import type { SpawnPty } from "../spawn-pty.injectable";

type WatchCallback = (phase: string, apiObj: unknown) => void;
type WatchDone = (err: unknown) => void;

const watch = vi.hoisted(() => ({
  start: undefined as
    | undefined
    | ((path: string, query: unknown, callback: WatchCallback, done: WatchDone) => Promise<AbortController>),
}));

vi.mock("@kubernetes/client-node", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kubernetes/client-node")>()),
  Watch: class {
    watch(path: string, query: unknown, callback: WatchCallback, done: WatchDone) {
      if (!watch.start) {
        throw new Error("tried to watch without a fake");
      }

      return watch.start(path, query, callback, done);
    }
  },
}));

/**
 * The websocket emits `close` once, and a node shell starts only after a
 * series of awaits, two of which create and wait for a privileged pod in the
 * cluster: a tab closed during any of them must leave neither a PTY nor a pod
 * behind, because nothing would ever remove them.
 */
describe("technical unit tests for node shell sessions", () => {
  type Stage =
    | "proxy"
    | "kubectl"
    | "proxy-kubeconfig"
    | "node"
    | "pod-creation"
    | "pod-wait"
    | "shell-environment"
    | "cwd";

  let di: DiContainer;
  let spawnPtyMock: MockedFunction<SpawnPty>;
  let closeDuring: Stage | undefined;
  let websocket: EventEmitter & { readyState: number };
  /**
   * The pods that exist in the fake cluster.
   */
  let pods: Set<string>;
  let createNamespacedPod: MockedFunction<(args: { namespace: string; body: V1Pod }) => Promise<V1Pod>>;
  let watchRequests: AbortController[];

  const close = () => {
    websocket.readyState = 3;
    websocket.emit("close", 1000);
  };

  const reach = (stage: Stage) => {
    if (closeDuring === stage) {
      close();
    }
  };

  const open = () =>
    di.inject(openNodeShellSessionInjectable)({
      cluster: new Cluster({
        contextName: "some-context-name",
        id: "some-cluster-id",
        kubeConfigPath: "/some-kube-config-path",
      }),
      tabId: "my-tab-id",
      nodeName: "some-node",
      websocket: websocket as unknown as WebSocket,
    });

  beforeEach(() => {
    di = getDiForUnitTesting();
    closeDuring = undefined;
    websocket = Object.assign(new EventEmitter(), { send: vi.fn(), readyState: 1, OPEN: 1 });
    pods = new Set();
    watchRequests = [];

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(baseBundledBinariesDirectoryInjectable, () => "/some-bundled-binaries-directory");
    di.override(buildVersionStateInjectable, () => "1.1.1");
    di.override(platformInjectable, () => "linux");
    di.override(pathExistsInjectable, () => () => {
      throw new Error("tried call pathExists without override");
    });
    di.override(pathExistsSyncInjectable, () => () => {
      throw new Error("tried call pathExistsSync without override");
    });
    di.override(readJsonSyncInjectable, () => () => {
      throw new Error("tried call readJsonSync without override");
    });
    di.override(writeJsonSyncInjectable, () => () => {
      throw new Error("tried call writeJsonSync without override");
    });
    di.override(statInjectable, () => async () => {
      reach("cwd");

      throw new Error("no such directory");
    });
    di.inject(freelensProxyPortInjectable).set(1111);

    di.override(userShellSettingInjectable, () => computed(() => "/bin/bash"));
    di.override(computeShellEnvironmentInjectable, () => async () => {
      reach("shell-environment");

      return {
        callWasSuccessful: true as const,
        response: { PATH: "/usr/bin", HOME: "/home/some-user" },
      };
    });

    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePaths: async () => {
            reach("proxy");

            return {
              kubeconfigPath: "/some-proxy-kubeconfig-file",
              cacheDirectoryPath: "/some-proxy-kubeconfig-cache-directory",
            };
          },
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );
    di.override(
      createKubectlInjectable,
      () => () =>
        ({
          kubectlVersion: "1.33.4",
          getPath: async () => {
            reach("kubectl");

            return "/some-kubectl-binary-dir/kubectl";
          },
          getVersionMatchedPath: () => "/some-kubectl-binary-dir/kubectl",
        }) as Partial<Kubectl> as Kubectl,
    );

    createNamespacedPod = vi.fn(async ({ body }) => {
      // The close lands while the request is in flight, which is where a
      // delete sent at once would overtake it: the pod exists only once the
      // API server has answered.
      await new Promise((resolve) => setTimeout(resolve, 0));
      reach("pod-creation");
      await new Promise((resolve) => setTimeout(resolve, 10));
      pods.add(body.metadata?.name ?? "");

      return body;
    });

    const coreApi = {
      createNamespacedPod,
      deleteNamespacedPod: async ({ name }: { name: string }) => {
        if (!pods.delete(name)) {
          throw new Error(`pods "${name}" not found`);
        }

        return {};
      },
    };

    di.override(loadProxyKubeconfigInjectable, () => async () => {
      reach("proxy-kubeconfig");

      return { makeApiClient: () => coreApi } as Partial<KubeConfig> as KubeConfig;
    });
    di.override(
      createKubeApiInjectable,
      () =>
        (() => ({
          get: async () => {
            reach("node");

            return { getOperatingSystem: () => "linux", getOperatingSystemImage: () => "" };
          },
        })) as unknown as CreateKubeApi,
    );
    di.override(createKubeJsonApiForClusterInjectable, () => (() => ({})) as unknown as CreateKubeJsonApiForCluster);

    watch.start = async (path, query, callback, done) => {
      const request = new AbortController();

      watchRequests.push(request);
      request.signal.addEventListener("abort", () => done(new Error("aborted")));
      setTimeout(() => {
        reach("pod-wait");

        for (const name of pods) {
          callback("ADDED", { metadata: { name }, status: { phase: "Running" } });
        }
      }, 0);

      return request;
    };

    spawnPtyMock = vi.fn(
      () =>
        ({
          cols: 80,
          rows: 40,
          pid: 12343,
          handleFlowControl: false,
          kill: vi.fn(),
          onData: vi.fn(),
          onExit: vi.fn(),
          pause: vi.fn(),
          process: "my-pty",
          resize: vi.fn(),
          resume: vi.fn(),
          write: vi.fn(),
          on: vi.fn(),
          clear: vi.fn(),
        }) as Partial<IPty> as IPty,
    );
    di.override(spawnPtyInjectable, () => spawnPtyMock);

    // The default of the preference, which is only applied when the store
    // has been read.
    di.inject(userPreferencesStateInjectable).downloadKubectlBinaries = true;
  });

  it("attaches to the pod when the terminal stays open, and stops watching it once it runs", async () => {
    await open();

    expect(spawnPtyMock).toHaveBeenCalledOnce();
    expect(spawnPtyMock.mock.calls[0][1]).toEqual(expect.arrayContaining(["attach", ...pods]));
    expect(pods.size).toBe(1);
    expect(watchRequests.map((request) => request.signal.aborted)).toEqual([true]);
  });

  it("deletes the pod when the terminal closes after the shell started", async () => {
    await open();

    close();

    await vi.waitFor(() => expect(pods.size).toBe(0));
  });

  it.each<Stage>(["proxy", "kubectl", "proxy-kubeconfig", "node"])(
    "creates no pod and spawns no PTY when it closes during the %s stage",
    async (stage) => {
      closeDuring = stage;

      await open();

      expect(createNamespacedPod).not.toHaveBeenCalled();
      expect(spawnPtyMock).not.toHaveBeenCalled();
      expect(di.inject(shellSessionProcessesInjectable).size).toBe(0);
    },
  );

  it.each<Stage>(["pod-creation", "pod-wait", "shell-environment", "cwd"])(
    "deletes the pod and spawns no PTY when it closes during the %s stage",
    async (stage) => {
      closeDuring = stage;

      await open();

      expect(createNamespacedPod).toHaveBeenCalledOnce();
      expect(spawnPtyMock).not.toHaveBeenCalled();
      expect(di.inject(shellSessionProcessesInjectable).size).toBe(0);
      await vi.waitFor(() => expect(pods.size).toBe(0));
      expect(watchRequests.every((request) => request.signal.aborted)).toBe(true);
    },
  );
});
