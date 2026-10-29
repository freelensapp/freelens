/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { computed, observable } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import freelensProxyPortInjectable from "../../freelens-proxy/freelens-proxy-port.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../processes.injectable";
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
    di.inject(freelensProxyPortInjectable).set(1111);
  });

  describe("when on windows", () => {
    let openLocalShellSession: OpenLocalShellSession;
    let spawnPtyMock: MockedFunction<SpawnPty>;
    let kubectlProblem: string | undefined;
    let ensurePathError: string | undefined;
    let kubectlDownloads: boolean;

    beforeEach(() => {
      di.override(platformInjectable, () => "win32");

      spawnPtyMock = vi.fn();
      kubectlProblem = undefined;
      ensurePathError = undefined;
      kubectlDownloads = false;
      di.override(spawnPtyInjectable, () => spawnPtyMock);

      di.override(
        createKubectlInjectable,
        () => () =>
          ({
            kubectlVersion: "1.33.4",
            getPath: async (opts?: KubectlProgressOptions) => {
              if (kubectlProblem) {
                opts?.onProblem?.(kubectlProblem);

                return "/some-bundled-kubectl-path";
              }

              if (kubectlDownloads) {
                opts?.onPhase?.("Downloading kubectl v1.33.4 ...");
                opts?.onDownloadProgress?.({ transferred: 61_970_432, total: 61_970_432 });
                opts?.onPhase?.("Verifying kubectl v1.33.4 ...");
              }

              return "/some-kubectl-binary-dir/kubectl";
            },
            getVersionMatchedPath: () => "/some-kubectl-binary-dir/kubectl",
            writeInitScripts: async () => "/some-kubectl-binary-dir",
          }) as Partial<Kubectl> as Kubectl,
      );

      di.override(
        kubeconfigManagerInjectable,
        () =>
          ({
            ensurePaths: async () => {
              if (ensurePathError) {
                throw new Error(ensurePathError);
              }

              return {
                kubeconfigPath: "/some-proxy-kubeconfig-file",
                cacheDirectoryPath: "/some-proxy-kubeconfig-cache-directory",
              };
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

      it("names the verification between the download and the shell, so 100% is not the last thing seen", async () => {
        kubectlDownloads = true;

        await openLocalShellSession({ cluster: cluster(), tabId: "my-tab-id", websocket: websocketFor(sent) });

        expect(statusMessages()).toEqual([
          { message: "Starting cluster proxy ...", level: "info" },
          { message: "Checking kubectl v1.33.4 ...", level: "info" },
          { message: "Downloading kubectl v1.33.4 ...", level: "info" },
          { message: "Downloading kubectl v1.33.4  100%  59.1MiB / 59.1MiB", level: "info" },
          { message: "Verifying kubectl v1.33.4 ...", level: "info" },
          { message: "Resolving shell environment ...", level: "info" },
          { message: "Starting shell ...", level: "info" },
        ]);
        expect(framesWhenSpawned).toBe(7);
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
        send: vi.fn((raw: string) => void sent.push(JSON.parse(raw))),
        readyState: 1,
        OPEN: 1,
      } as Partial<WebSocket> as WebSocket;

      return socket;
    };

    let spawnPtyMock: MockedFunction<SpawnPty>;
    let writeInitScripts: MockedFunction<Kubectl["writeInitScripts"]>;
    let kubectlPath: string;
    let sent: TerminalMessage[];

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

      return { file, args, options, env: options.env ?? {} };
    };

    beforeEach(() => {
      di.override(baseBundledBinariesDirectoryInjectable, () => "/some-bundled-binaries-directory");
      di.override(computeShellEnvironmentInjectable, () => async () => ({
        callWasSuccessful: true as const,
        response: {
          PATH: "/home/some-user/bin:/usr/local/bin:/usr/bin",
          KUBECONFIG: "/home/some-user/.kube/config",
          KUBECACHEDIR: "/home/some-user/.kube/some-cache",
          HOME: "/home/some-user",
        },
      }));

      sent = [];
      writeInitScripts = vi.fn(async () => "/some-kubectl-binary-dir");
      kubectlPath = "/some-kubectl-binary-dir/kubectl";
      di.override(
        createKubectlInjectable,
        () => () =>
          ({
            kubectlVersion: "1.33.4",
            getPath: async () => kubectlPath,
            getVersionMatchedPath: () => "/some-kubectl-binary-dir/kubectl",
            writeInitScripts,
          }) as Partial<Kubectl> as Kubectl,
      );
      di.override(
        kubeconfigManagerInjectable,
        () =>
          ({
            ensurePaths: async () => ({
              kubeconfigPath: "/some-proxy-kubeconfig-file",
              cacheDirectoryPath: "/some-proxy-kubeconfig-cache-directory",
            }),
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

    it("prepends the cluster's kubectl directory to PATH and appends the bundled binaries directory", async () => {
      const { env } = await openWithShell("/bin/bash");

      expect((env.PATH ?? "").split(":")).toEqual([
        "/some-kubectl-binary-dir",
        "/home/some-user/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/some-bundled-binaries-directory",
      ]);
    });

    it("puts no directory derived from the kubectl or helm preference on PATH", async () => {
      const state = di.inject(userPreferencesStateInjectable);

      state.helmBinariesPath = "/opt/homebrew/bin/helm";
      state.kubectlBinariesPath = "/opt/kubectl/bin/kubectl";
      state.downloadKubectlBinaries = false;
      kubectlPath = "/opt/kubectl/bin/kubectl";

      const { env } = await openWithShell("/bin/bash");

      expect((env.PATH ?? "").split(":")).toEqual([
        "/home/some-user/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/some-bundled-binaries-directory",
      ]);
      expect(writeInitScripts).toHaveBeenCalledWith(
        expect.objectContaining({ pathPrefix: [], pathSuffix: ["/some-bundled-binaries-directory"] }),
      );
    });

    it("puts the kubectl directory on PATH only once the version-matched kubectl is in place", async () => {
      // What `getPath` falls back to when the download failed.
      kubectlPath = "/some-bundled-binaries-directory/kubectl";

      const { env } = await openWithShell("/bin/bash");

      expect((env.PATH ?? "").split(":")).toEqual([
        "/home/some-user/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/some-bundled-binaries-directory",
      ]);
    });

    it("writes the init scripts with the same directories it puts around PATH", async () => {
      await openWithShell("/bin/bash");

      expect(writeInitScripts).toHaveBeenCalledWith(
        expect.objectContaining({
          pathPrefix: ["/some-kubectl-binary-dir"],
          pathSuffix: ["/some-bundled-binaries-directory"],
        }),
      );
    });

    it("starts bash without its rc files, and says so, when the init scripts cannot be written", async () => {
      writeInitScripts.mockRejectedValueOnce(new Error("EACCES: permission denied"));

      const { args, env } = await openWithShell("/bin/bash");

      expect(args).toEqual(["--norc"]);
      expect(env.KUBECONFIG).toBe("/some-proxy-kubeconfig-file");
      expect(sent).toContainEqual({
        type: TerminalChannels.STATUS,
        data: {
          message:
            "Failed to write the shell init scripts for kubectl v1.33.4 (EACCES: permission denied) - starting the shell without them",
          level: "error",
        },
      });
    });

    it("starts the shell the setting names now, not the one of an earlier terminal of the cluster", async () => {
      const shellSetting = observable.box("/bin/bash");
      const cluster = new Cluster({
        contextName: "some-context-name",
        id: "some-cluster-id",
        kubeConfigPath: "/some-kube-config-path",
      });

      di.override(platformInjectable, () => "linux");
      di.override(userShellSettingInjectable, () => computed(() => shellSetting.get()));

      const openLocalShellSession = di.inject(openLocalShellSessionInjectable);

      await openLocalShellSession({ cluster, tabId: "some-tab-id", websocket: websocket() });
      shellSetting.set("/bin/zsh");
      await openLocalShellSession({ cluster, tabId: "other-tab-id", websocket: websocket() });

      expect(spawnPtyMock.mock.calls.map(([file, , options]) => [file, options.env?.PTYSHELL])).toEqual([
        ["/bin/bash", "/bin/bash"],
        ["/bin/zsh", "/bin/zsh"],
      ]);
    });

    it("points KUBECONFIG at the cluster's proxy kubeconfig", async () => {
      const { env } = await openWithShell("/bin/bash");

      expect(env.KUBECONFIG).toBe("/some-proxy-kubeconfig-file");
    });

    it("points KUBECACHEDIR at the cache directory of the proxy kubeconfig, replacing the user's own", async () => {
      const { env } = await openWithShell("/bin/bash");

      expect(env.KUBECACHEDIR).toBe("/some-proxy-kubeconfig-cache-directory");
    });

    it("passes KUBECACHEDIR on to WSL as a path, like KUBECONFIG", async () => {
      const { env } = await openWithShell("powershell.exe", "win32");

      expect(env.KUBECACHEDIR).toBe("/some-proxy-kubeconfig-cache-directory");
      expect((env.WSLENV ?? "").split(":")).toContain("KUBECACHEDIR/up");
    });

    it("passes FREELENS_PROXY_TOKEN on to WSL and back out of it, with no flag", async () => {
      const { env } = await openWithShell("powershell.exe", "win32");

      expect(env.FREELENS_PROXY_TOKEN).toBeTruthy();
      expect((env.WSLENV ?? "").split(":")).toContain("FREELENS_PROXY_TOKEN");
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

    it("forces PATH, KUBECONFIG and KUBECACHEDIR through an init command for fish", async () => {
      const { args } = await openWithShell("/usr/bin/fish");

      expect(args).toEqual([
        "--login",
        "--init-command",
        `export PATH="/some-kubectl-binary-dir:$PATH:/some-bundled-binaries-directory"; export KUBECONFIG="/some-proxy-kubeconfig-file"; export KUBECACHEDIR="/some-proxy-kubeconfig-cache-directory"`,
      ]);
    });

    it("forces PATH through a command for powershell", async () => {
      const { args } = await openWithShell("powershell.exe", "win32");

      expect(args).toEqual([
        "-NoExit",
        "-command",
        `& {$Env:PATH="/some-kubectl-binary-dir;$Env:PATH;/some-bundled-binaries-directory"}`,
      ]);
    });

    /**
     * node-pty 1.2 has no winpty and ignores `useConpty`. Without the bundled
     * DLL it runs on the system ConPTY, whose kill() forks the Electron binary
     * as Node to list the processes attached to the shell's console.
     */
    it("spawns the shell on node-pty's bundled ConPTY DLL, without the stale winpty switch", async () => {
      const { options } = await openWithShell("powershell.exe", "win32");

      expect(options).toHaveProperty("useConptyDll", true);
      expect(options).not.toHaveProperty("useConpty");
    });

    /**
     * The websocket emits `close` once, and the shell starts only after a
     * series of awaits: a tab closed during any of them must leave no PTY
     * behind, because nothing would ever kill it.
     */
    describe("when the terminal closes while the session starts", () => {
      type Stage = "proxy" | "kubectl" | "init-scripts" | "shell-environment" | "cwd";

      let closeDuring: Stage | undefined;
      let closableWebsocket: EventEmitter & { readyState: number };

      const reach = (stage: Stage) => {
        if (closeDuring === stage) {
          closableWebsocket.readyState = 3;
          closableWebsocket.emit("close", 1000);
        }
      };

      const open = () =>
        di.inject(openLocalShellSessionInjectable)({
          cluster: new Cluster({
            contextName: "some-context-name",
            id: "some-cluster-id",
            kubeConfigPath: "/some-kube-config-path",
          }),
          tabId: "my-tab-id",
          websocket: closableWebsocket as unknown as WebSocket,
        });

      beforeEach(() => {
        closeDuring = undefined;
        closableWebsocket = Object.assign(new EventEmitter(), { send: vi.fn(), readyState: 1, OPEN: 1 });

        di.override(platformInjectable, () => "linux");
        di.override(userShellSettingInjectable, () => computed(() => "/bin/bash"));
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

                return kubectlPath;
              },
              getVersionMatchedPath: () => "/some-kubectl-binary-dir/kubectl",
              writeInitScripts: async () => {
                reach("init-scripts");

                return "/some-kubectl-binary-dir";
              },
            }) as Partial<Kubectl> as Kubectl,
        );
        di.override(computeShellEnvironmentInjectable, () => async () => {
          reach("shell-environment");

          return {
            callWasSuccessful: true as const,
            response: { PATH: "/usr/bin", HOME: "/home/some-user" },
          };
        });
        di.override(statInjectable, () => async () => {
          reach("cwd");

          throw new Error("no such directory");
        });
      });

      it("starts the shell when the terminal stays open", async () => {
        await open();

        expect(spawnPtyMock).toHaveBeenCalledOnce();
      });

      it.each<Stage>(["proxy", "kubectl", "init-scripts", "shell-environment", "cwd"])(
        "spawns no PTY when it closes during the %s stage",
        async (stage) => {
          closeDuring = stage;

          await open();

          expect(spawnPtyMock).not.toHaveBeenCalled();
          expect(di.inject(shellSessionProcessesInjectable).size).toBe(0);
        },
      );
    });
  });
});
