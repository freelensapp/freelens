/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import { TerminalChannels } from "../../../common/terminal/channels";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionStateInjectable } from "../../../features/vars/build-version/main/init.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import lensProxyPortInjectable from "../../lens-proxy/lens-proxy-port.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import openStandaloneShellSessionInjectable from "./open.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { MockedFunction } from "vitest";
import type WebSocket from "ws";

import type { TerminalMessage } from "../../../common/terminal/channels";
import type { SpawnPty } from "../spawn-pty.injectable";
import type { OpenStandaloneShellSession } from "./open.injectable";

describe("technical unit tests for standalone shell sessions", () => {
  let di: DiContainer;
  let openStandaloneShellSession: OpenStandaloneShellSession;
  let spawnPtyMock: MockedFunction<SpawnPty>;
  let sent: TerminalMessage[];
  let createKubectl: MockedFunction<() => unknown>;
  let ensurePath: MockedFunction<() => Promise<string>>;

  const websocket = () => {
    const socket = {
      on: vi.fn(() => socket),
      once: vi.fn(() => socket),
      send: vi.fn((raw: string) => void sent.push(JSON.parse(raw))),
      readyState: 1,
      OPEN: 1,
    } as Partial<WebSocket> as WebSocket;

    return socket;
  };

  const spawnedWith = () => {
    const call = spawnPtyMock.mock.calls[0];

    expect(call).toBeDefined();

    const [file, args, options] = call;

    return { file, args, env: options.env ?? {} };
  };

  beforeEach(() => {
    di = getDiForUnitTesting();
    sent = [];

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(baseBundledBinariesDirectoryInjectable, () => "/some-bundled-binaries-directory");
    di.override(buildVersionStateInjectable, () => "1.1.1");
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

    di.override(userShellSettingInjectable, () => computed(() => "/bin/zsh"));
    di.override(computeShellEnvironmentInjectable, () => async () => ({
      callWasSuccessful: true as const,
      response: {
        PATH: "/home/some-user/bin:/usr/local/bin:/usr/bin",
        KUBECONFIG: "/home/some-user/.kube/config",
        HOME: "/home/some-user",
      },
    }));

    // A standalone session has no cluster, so neither of these may be reached.
    createKubectl = vi.fn(() => {
      throw new Error("tried to create a kubectl for a session without a cluster");
    });
    ensurePath = vi.fn(async () => {
      throw new Error("tried to start the cluster proxy for a session without a cluster");
    });
    di.override(createKubectlInjectable, () => createKubectl);
    di.override(kubeconfigManagerInjectable, () => ({ ensurePath }));

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

    openStandaloneShellSession = di.inject(openStandaloneShellSessionInjectable);
  });

  it("never constructs a kubectl nor starts the cluster proxy", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(createKubectl).not.toHaveBeenCalled();
    expect(ensurePath).not.toHaveBeenCalled();
  });

  it("reports only the phases that a session without a cluster actually has", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(
      sent
        .filter((message) => message.type === TerminalChannels.STATUS)
        .map((message) => (message as { data: { message: string } }).data.message),
    ).toEqual(["Resolving shell environment ...", "Starting shell ..."]);
  });

  it("leaves the user's own KUBECONFIG alone", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.KUBECONFIG).toBe("/home/some-user/.kube/config");
  });

  it("appends the bundled binaries after the user's own PATH, so a host kubectl still wins", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    expect(spawnedWith().env.PATH).toBe(
      [
        "/home/some-user/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/some-bundled-binaries-directory",
        "/some-directory-for-user-data/binaries",
      ].join(":"),
    );
  });

  it("appends the configured helm directory when there is one", async () => {
    di.inject(userPreferencesStateInjectable).helmBinariesPath = "/opt/homebrew/bin/helm";

    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    const path = (spawnedWith().env.PATH ?? "").split(":");

    expect(path).toEqual([
      "/home/some-user/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/some-bundled-binaries-directory",
      "/opt/homebrew/bin",
      "/some-directory-for-user-data/binaries",
    ]);
  });

  it("passes no init file, no ZDOTDIR and no PATH-forcing argument to the shell", async () => {
    await openStandaloneShellSession({ tabId: "my-tab-id", websocket: websocket() });

    const { args, env } = spawnedWith();

    expect(args).toEqual(["--login"]);
    expect(env.ZDOTDIR).toBeUndefined();
    expect(env.OLD_ZDOTDIR).toBeUndefined();
  });
});
