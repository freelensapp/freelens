/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../common/cluster/cluster";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../common/fs/read-json-sync.injectable";
import statInjectable from "../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import platformInjectable from "../../common/vars/platform.injectable";
import computeShellEnvironmentInjectable from "../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../features/user-preferences/common/shell-setting.injectable";
import { buildVersionStateInjectable } from "../../features/vars/build-version/main/init.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../kubectl/create-kubectl.injectable";
import lensProxyPortInjectable from "../lens-proxy/lens-proxy-port.injectable";
import openLocalShellSessionInjectable from "./local-shell-session/open.injectable";
import shellSessionProcessesInjectable from "./processes.injectable";
import spawnPtyInjectable from "./spawn-pty.injectable";
import openStandaloneShellSessionInjectable from "./standalone-shell-session/open.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { MockedFunction } from "vitest";
import type WebSocket from "ws";

import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../kubectl/kubectl";
import type { SpawnPty } from "./spawn-pty.injectable";

/**
 * A running PTY is keyed by `${cluster?.id ?? "standalone"}:${tabId}`, and the
 * key is also what decides whether a session resumes into an existing shell.
 * The two kinds of session therefore have to stay apart even when they are
 * opened for the same tab id.
 */
describe("the identity of a shell session's PTY", () => {
  let di: DiContainer;
  let spawnPtyMock: MockedFunction<SpawnPty>;

  const tabId = "my-tab-id";

  const websocket = () => {
    const socket = {
      on: vi.fn(() => socket),
      once: vi.fn(() => socket),
      send: vi.fn(),
      readyState: 1,
      OPEN: 1,
    } as Partial<WebSocket> as WebSocket;

    return socket;
  };

  const cluster = () =>
    new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });

  const openStandaloneSession = () =>
    di.inject(openStandaloneShellSessionInjectable)({ tabId, websocket: websocket() });

  const openClusterSession = () =>
    di.inject(openLocalShellSessionInjectable)({ cluster: cluster(), tabId, websocket: websocket() });

  const runningProcesses = () => di.inject(shellSessionProcessesInjectable);

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
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
    di.override(statInjectable, () => () => {
      throw new Error("tried call stat without override");
    });
    di.inject(lensProxyPortInjectable).set(1111);

    di.override(userShellSettingInjectable, () => computed(() => "/bin/bash"));
    di.override(computeShellEnvironmentInjectable, () => async () => ({
      callWasSuccessful: true as const,
      response: { PATH: "/usr/bin", HOME: "/home/some-user" },
    }));

    di.override(
      createKubectlInjectable,
      () => () =>
        ({
          kubectlVersion: "1.33.4",
          binDir: async () => "/some-kubectl-binary-dir",
          getBundledPath: () => "/some-bundled-kubectl-path",
        }) as Partial<Kubectl> as Kubectl,
    );
    di.override(
      kubeconfigManagerInjectable,
      () =>
        ({
          ensurePath: async () => "/some-proxy-kubeconfig-file",
        }) as Partial<KubeconfigManager> as KubeconfigManager,
    );

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
  });

  it("keys a session without a cluster apart from a cluster's session for the same tab", async () => {
    await openStandaloneSession();
    await openClusterSession();

    expect([...runningProcesses().keys()]).toEqual([`standalone:${tabId}`, `some-cluster-id:${tabId}`]);
  });

  it("spawns a shell for each of them, so neither resumes into the other's", async () => {
    await openStandaloneSession();
    await openClusterSession();

    expect(spawnPtyMock).toHaveBeenCalledTimes(2);
  });

  it("resumes a session without a cluster into its own shell", async () => {
    await openStandaloneSession();
    await openClusterSession();
    await openStandaloneSession();

    expect(spawnPtyMock).toHaveBeenCalledTimes(2);
    expect(runningProcesses().size).toBe(2);
  });
});
