/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import { TerminalChannels } from "../../../common/terminal/channels";
import platformInjectable from "../../../common/vars/platform.injectable";
import { buildVersionStateInjectable } from "../../../features/vars/build-version/main/init.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import lensProxyPortInjectable from "../../lens-proxy/lens-proxy-port.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import openLocalShellSessionInjectable from "./open.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
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
});
