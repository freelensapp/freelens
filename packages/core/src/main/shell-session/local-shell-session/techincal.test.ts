/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import { TerminalChannels } from "../../../common/terminal/channels";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import platformInjectable from "../../../common/vars/platform.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionStateInjectable } from "../../../features/vars/build-version/main/init.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import lensProxyPortInjectable from "../../lens-proxy/lens-proxy-port.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import openLocalShellSessionInjectable from "./open.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { MockedFunction } from "vitest";
import type WebSocket from "ws";

import type { TerminalMessage } from "../../../common/terminal/channels";
import type { KubeconfigManager } from "../../kubeconfig-manager/kubeconfig-manager";
import type { Kubectl, KubectlProgressOptions } from "../../kubectl/kubectl";
import type { SpawnPty } from "../spawn-pty.injectable";
import type { OpenLocalShellSession } from "./open.injectable";

describe("technical unit tests for local shell sessions", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
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
  });

  describe("when on windows", () => {
    let openLocalShellSession: OpenLocalShellSession;
    let spawnPtyMock: MockedFunction<SpawnPty>;
    let kubectlProblem: string | undefined;
    let ensurePathError: string | undefined;

    beforeEach(() => {
      di.override(platformInjectable, () => "win32");

      spawnPtyMock = vi.fn();
      kubectlProblem = undefined;
      ensurePathError = undefined;
      di.override(spawnPtyInjectable, () => spawnPtyMock);

      di.override(
        createKubectlInjectable,
        () => () =>
          ({
            kubectlVersion: "1.33.4",
            binDir: async (opts?: KubectlProgressOptions) => {
              if (kubectlProblem) {
                opts?.onProblem?.(kubectlProblem);

                return "";
              }

              return "/some-kubectl-binary-dir";
            },
            getBundledPath: () => "/some-bundled-kubectl-path",
          }) as Partial<Kubectl> as Kubectl,
      );

      di.override(
        kubeconfigManagerInjectable,
        () =>
          ({
            ensurePath: async () => {
              if (ensurePathError) {
                throw new Error(ensurePathError);
              }

              return "/some-proxy-kubeconfig-file";
            },
          }) as Partial<KubeconfigManager> as KubeconfigManager,
      );

      openLocalShellSession = di.inject(openLocalShellSessionInjectable);
    });

    describe("when reporting the startup progress", () => {
      let sent: TerminalMessage[];
      let framesWhenSpawned: number;

      const websocketFor = (sent: TerminalMessage[]) => {
        const websocket = {
          on: vi.fn(() => websocket),
          once: vi.fn(() => websocket),
          send: vi.fn((raw: string) => void sent.push(JSON.parse(raw))),
          readyState: 1,
          OPEN: 1,
        } as Partial<WebSocket> as WebSocket;

        return websocket;
      };

      const cluster = () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-kube-config-path",
        });

      const statusMessages = () =>
        sent
          .filter((message) => message.type === TerminalChannels.STATUS)
          .map((message) => (message as { data: { message: string; level: string } }).data);

      beforeEach(() => {
        sent = [];
        framesWhenSpawned = -1;

        spawnPtyMock.mockImplementation(() => {
          framesWhenSpawned = sent.length;

          return {
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
          };
        });
      });

      it("names every phase, all of them before the shell process is spawned", async () => {
        await openLocalShellSession({ cluster: cluster(), tabId: "my-tab-id", websocket: websocketFor(sent) });

        expect(statusMessages()).toEqual([
          { message: "Starting cluster proxy ...", level: "info" },
          { message: "Checking kubectl v1.33.4 ...", level: "info" },
          { message: "Resolving shell environment ...", level: "info" },
          { message: "Starting shell ...", level: "info" },
        ]);
        expect(framesWhenSpawned).toBe(4);
      });

      it("reports a kubectl problem as a sticky error, and still opens the shell", async () => {
        kubectlProblem = "Failed to download kubectl v1.33.4 (Not Found) - using the bundled v1.34.1";

        await openLocalShellSession({ cluster: cluster(), tabId: "my-tab-id", websocket: websocketFor(sent) });

        expect(statusMessages()).toContainEqual({
          message: "Failed to download kubectl v1.33.4 (Not Found) - using the bundled v1.34.1",
          level: "error",
        });
        expect(spawnPtyMock).toHaveBeenCalled();
      });

      it("lets a failure to start the cluster proxy reject, so the session failure can be reported", async () => {
        ensurePathError = "the proxy did not become ready";

        await expect(
          openLocalShellSession({ cluster: cluster(), tabId: "my-tab-id", websocket: websocketFor(sent) }),
        ).rejects.toThrow("the proxy did not become ready");

        expect(statusMessages()).toEqual([{ message: "Starting cluster proxy ...", level: "info" }]);
        expect(spawnPtyMock).not.toHaveBeenCalled();
      });
    });

    describe("when opening a local shell session", () => {
      it("should pass through all environment variables to shell", async () => {
        process.env.MY_TEST_ENV_VAR = "true";

        spawnPtyMock.mockImplementationOnce((file, args, options) => {
          expect(options.env).toMatchObject({
            MY_TEST_ENV_VAR: "true",
          });

          return {
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
            clear: vi.fn(), // Add the clear method
          };
        });

        const websocket = {
          on: vi.fn(() => websocket),
          once: vi.fn(() => websocket),
        } as Partial<WebSocket> as WebSocket;

        const cluster = new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-kube-config-path",
        });

        await openLocalShellSession({
          cluster,
          tabId: "my-tab-id",
          websocket,
        });
      });
    });
  });

  /**
   * A cluster session has to keep running the kubectl matched to its cluster,
   * which is what all of these are about: the composition of `PATH`, and the
   * arguments that make each shell re-prepend the same directory from inside
   * its own startup files. They assert order rather than membership, because a
   * membership check still passes when the composition is inverted.
   */
  describe("when opening a session for a cluster", () => {
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

    let spawnPtyMock: MockedFunction<SpawnPty>;

    const openWithShell = async (shell: string, platform = "linux") => {
      di.override(platformInjectable, () => platform);
      di.override(userShellSettingInjectable, () => computed(() => shell));

      await di.inject(openLocalShellSessionInjectable)({
        cluster: new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-kube-config-path",
        }),
        tabId: "my-tab-id",
        websocket: websocket(),
      });

      const call = spawnPtyMock.mock.calls[0];

      expect(call).toBeDefined();

      const [file, args, options] = call;

      return { file, args, env: options.env ?? {} };
    };

    beforeEach(() => {
      di.override(baseBundledBinariesDirectoryInjectable, () => "/some-bundled-binaries-directory");
      di.override(computeShellEnvironmentInjectable, () => async () => ({
        callWasSuccessful: true as const,
        response: {
          PATH: "/home/some-user/bin:/usr/local/bin:/usr/bin",
          KUBECONFIG: "/home/some-user/.kube/config",
          HOME: "/home/some-user",
        },
      }));

      di.override(
        createKubectlInjectable,
        () => () =>
          ({
            kubectlVersion: "1.33.4",
            binDir: async () => "/some-kubectl-binary-dir",
            getBundledPath: () => "/some-bundled-binaries-directory/kubectl",
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

      // The default of the preference, which is only applied when the store
      // has been read.
      di.inject(userPreferencesStateInjectable).downloadKubectlBinaries = true;
    });

    it("prepends the cluster's kubectl directory to PATH, ahead of everything else, and appends nothing", async () => {
      const { env } = await openWithShell("/bin/bash");

      expect((env.PATH ?? "").split(":")).toEqual([
        "/some-kubectl-binary-dir",
        "/some-directory-for-user-data/binaries",
        "/home/some-user/bin",
        "/usr/local/bin",
        "/usr/bin",
      ]);
    });

    it("points KUBECONFIG at the cluster's proxy kubeconfig", async () => {
      const { env } = await openWithShell("/bin/bash");

      expect(env.KUBECONFIG).toBe("/some-proxy-kubeconfig-file");
    });

    it("starts bash with the init file that re-prepends the kubectl directory", async () => {
      const { args } = await openWithShell("/bin/bash");

      expect(args).toEqual(["--init-file", "/some-kubectl-binary-dir/.bash_set_path"]);
    });

    it("redirects ZDOTDIR at the kubectl directory for zsh, keeping the user's own as OLD_ZDOTDIR", async () => {
      const { args, env } = await openWithShell("/bin/zsh");

      expect(args).toEqual(["--login"]);
      expect(env.ZDOTDIR).toBe("/some-kubectl-binary-dir");
      expect(env.OLD_ZDOTDIR).toBe("/home/some-user");
    });

    it("forces PATH and KUBECONFIG through an init command for fish", async () => {
      const { args } = await openWithShell("/usr/bin/fish");

      expect(args).toEqual([
        "--login",
        "--init-command",
        `export PATH="/some-kubectl-binary-dir:/some-directory-for-user-data/binaries:/some-bundled-binaries-directory:$PATH"; export KUBECONFIG="/some-proxy-kubeconfig-file"`,
      ]);
    });

    it("forces PATH through a command for powershell", async () => {
      const { args } = await openWithShell("powershell.exe", "win32");

      expect(args).toEqual([
        "-NoExit",
        "-command",
        `& {$Env:PATH="/some-kubectl-binary-dir;/some-directory-for-user-data/binaries;/some-bundled-binaries-directory;$Env:PATH"}`,
      ]);
    });
  });
});
