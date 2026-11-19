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
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import pathExistsInjectable from "../../../common/fs/path-exists.injectable";
import pathExistsSyncInjectable from "../../../common/fs/path-exists-sync.injectable";
import readJsonSyncInjectable from "../../../common/fs/read-json-sync.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import platformInjectable from "../../../common/vars/platform.injectable";
import freelensProxyPortInjectable from "../../../main/freelens-proxy/freelens-proxy-port.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../../../main/shell-session/processes.injectable";
import { WebSocketCloseEvent } from "../../../main/shell-session/shell-session";
import spawnPtyInjectable from "../../../main/shell-session/spawn-pty.injectable";
import computeShellEnvironmentInjectable from "../../shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../user-preferences/common/state.injectable";
import { buildVersionStateInjectable } from "../../vars/build-version/main/init.injectable";
import openPodTerminalSessionInjectable from "./open.injectable";
import { linuxPodShellScript } from "./pod-terminal-session";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IPty } from "node-pty";
import type { MockedFunction } from "vitest";
import type WebSocket from "ws";

import type { ExecFile } from "../../../common/fs/exec-file.injectable";
import type { KubeconfigManager } from "../../../main/kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../../../main/kubectl/kubectl";
import type { SpawnPty } from "../../../main/shell-session/spawn-pty.injectable";
import type { PodTerminalTarget } from "../common/pod-terminal";

const kubectlPath = "/some-kubectl-binary-dir/kubectl";
const cacheDirArgs = ["--cache-dir", "/some-proxy-kubeconfig-cache-directory"];
const targetArgs = [...cacheDirArgs, "-n", "some-namespace", "some-pod", "-c", "some-container"];

const pidReport = (pid: number) => `\x1b]6973;freelens-pod-shell-pid=${pid}\x07`;

interface FakePty {
  pty: IPty;
  output: (data: string) => void;
  exit: (exitCode: number) => void;
}

const createFakePty = (): FakePty => {
  const events = new EventEmitter();
  const listen =
    (event: string) =>
    (listener: (...args: any[]) => void): { dispose: () => void } => {
      events.on(event, listener);

      return { dispose: () => events.off(event, listener) };
    };

  return {
    pty: {
      cols: 80,
      rows: 30,
      pid: 12343,
      handleFlowControl: false,
      kill: vi.fn(),
      onData: listen("data"),
      onExit: listen("exit"),
      pause: vi.fn(),
      process: "kubectl",
      resize: vi.fn(),
      resume: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
      clear: vi.fn(),
    } as Partial<IPty> as IPty,
    output: (data) => events.emit("data", data),
    exit: (exitCode) => events.emit("exit", { exitCode }),
  };
};

describe("pod terminal sessions", () => {
  let di: DiContainer;
  let spawnPtyMock: MockedFunction<SpawnPty>;
  let fakePty: FakePty;
  let execFileMock: MockedFunction<(...args: Parameters<ExecFile>) => ReturnType<ExecFile>>;
  let websocket: EventEmitter & {
    readyState: number;
    OPEN: number;
    send: MockedFunction<(data: string) => void>;
    close: MockedFunction<(code?: number) => void>;
  };

  const close = (code = WebSocketCloseEvent.NormalClosure) => {
    websocket.readyState = 3;
    websocket.emit("close", code);
  };

  let cluster: Cluster;

  const open = (target: Partial<PodTerminalTarget> = {}) =>
    di.inject(openPodTerminalSessionInjectable)({
      cluster,
      tabId: "my-tab-id",
      target: {
        mode: "exec",
        namespace: "some-namespace",
        pod: "some-pod",
        container: "some-container",
        ...target,
      },
      websocket: websocket as unknown as WebSocket,
    });

  const spawnedArgs = () => spawnPtyMock.mock.calls[0][1];

  beforeEach(() => {
    di = getDiForUnitTesting();
    websocket = Object.assign(new EventEmitter(), { send: vi.fn(), close: vi.fn(), readyState: 1, OPEN: 1 });
    cluster = new Cluster({
      contextName: "some-context-name",
      id: "some-cluster-id",
      kubeConfigPath: "/some-kube-config-path",
    });

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
      throw new Error("no such directory");
    });
    di.inject(freelensProxyPortInjectable).set(1111);

    di.override(userShellSettingInjectable, () => computed(() => "/bin/bash"));
    di.override(computeShellEnvironmentInjectable, () => async () => ({
      callWasSuccessful: true as const,
      response: { PATH: "/usr/bin", HOME: "/home/some-user" },
    }));
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
    di.override(
      createKubectlInjectable,
      () => () =>
        ({
          kubectlVersion: "1.33.4",
          getPath: async () => kubectlPath,
          getVersionMatchedPath: () => kubectlPath,
        }) as Partial<Kubectl> as Kubectl,
    );

    fakePty = createFakePty();
    spawnPtyMock = vi.fn(() => fakePty.pty);
    di.override(spawnPtyInjectable, () => spawnPtyMock);

    execFileMock = vi.fn(async () => ({ callWasSuccessful: true as const, response: "" }));
    di.override(execFileInjectable, () => execFileMock as unknown as ExecFile);

    di.inject(userPreferencesStateInjectable).downloadKubectlBinaries = true;
  });

  describe("given a shell in a Linux container", () => {
    it("runs kubectl exec with an argument array, through a wrapper that reports the shell's PID", async () => {
      await open();

      expect(spawnPtyMock).toHaveBeenCalledOnce();
      expect(spawnPtyMock.mock.calls[0][0]).toBe(kubectlPath);
      expect(spawnedArgs()).toEqual(["exec", "-i", "-t", ...targetArgs, "--", "sh", "-c", linuxPodShellScript]);
      expect(linuxPodShellScript).toMatch(/^printf '\\033\]6973;freelens-pod-shell-pid=%s\\007' "\$\$"; /);
    });

    it("leaves the choice of the container to kubectl when the tab names none", async () => {
      await open({ container: undefined });

      expect(spawnedArgs()).toEqual([
        "exec",
        "-i",
        "-t",
        ...cacheDirArgs,
        "-n",
        "some-namespace",
        "some-pod",
        "--",
        "sh",
        "-c",
        linuxPodShellScript,
      ]);
    });

    it("hangs up the shell in the container with a second exec when the tab closes", async () => {
      await open();

      fakePty.output("Defaulted container ...\r\n");
      fakePty.output(`${pidReport(42)}$ `);
      close();

      expect(fakePty.pty.kill).toHaveBeenCalled();
      expect(execFileMock).toHaveBeenCalledOnce();
      expect(execFileMock.mock.calls[0][0]).toBe(kubectlPath);
      expect(execFileMock.mock.calls[0][1]).toEqual([
        "exec",
        ...targetArgs,
        "--",
        "sh",
        "-c",
        'kill -HUP "$1"',
        "sh",
        "42",
      ]);
      expect(execFileMock.mock.calls[0][2]).toEqual(
        expect.objectContaining({ env: expect.objectContaining({ KUBECONFIG: "/some-proxy-kubeconfig-file" }) }),
      );
    });

    it("reads a PID report split across chunks of output", async () => {
      await open();

      const report = pidReport(4242);

      fakePty.output(report.slice(0, 10));
      fakePty.output(report.slice(10));
      close();

      expect(execFileMock.mock.calls[0][1]?.at(-1)).toBe("4242");
    });

    it("takes the first PID report only, not one printed later in the shell", async () => {
      await open();

      fakePty.output(pidReport(42));
      fakePty.output(pidReport(1));
      close();

      expect(execFileMock.mock.calls[0][1]?.at(-1)).toBe("42");
    });

    it("signals nothing when the shell reported no PID", async () => {
      await open();

      fakePty.output("x".repeat(5000));
      fakePty.output(pidReport(42));
      close();

      expect(execFileMock).not.toHaveBeenCalled();
    });

    it("signals nothing when the shell has exited on its own", async () => {
      await open();

      fakePty.output(pidReport(42));
      fakePty.exit(0);
      close();

      expect(execFileMock).not.toHaveBeenCalled();
    });

    it("keeps the shell for a reload, and hangs it up once the resumed tab closes", async () => {
      cluster.disconnected.set(false);
      await open();

      fakePty.output(pidReport(42));
      close(WebSocketCloseEvent.GoingAway);

      expect(fakePty.pty.kill).not.toHaveBeenCalled();
      expect(execFileMock).not.toHaveBeenCalled();
      expect(di.inject(shellSessionProcessesInjectable).size).toBe(1);

      websocket = Object.assign(new EventEmitter(), { send: vi.fn(), close: vi.fn(), readyState: 1, OPEN: 1 });
      await open();

      expect(spawnPtyMock).toHaveBeenCalledOnce();

      close();

      expect(execFileMock).toHaveBeenCalledOnce();
      expect(execFileMock.mock.calls[0][1]?.at(-1)).toBe("42");
    });

    it("writes nothing to the shell when the tab closes", async () => {
      await open();

      fakePty.output(pidReport(42));
      close();

      expect(fakePty.pty.write).not.toHaveBeenCalled();
    });
  });

  describe("given a shell in a Windows container", () => {
    it("runs PowerShell with a marker on its command line, and ends what has that marker when the tab closes", async () => {
      await open({ windows: true });

      const args = spawnedArgs() as string[];

      expect(args.slice(0, -1)).toEqual([
        "exec",
        "-i",
        "-t",
        ...targetArgs,
        "--",
        "powershell",
        "-NoLogo",
        "-NoExit",
        "-Command",
      ]);

      const marker = args.at(-1)?.match(/^# (freelens-pod-shell-[0-9a-f]{32})$/)?.[1];

      expect(marker).toBeDefined();

      close();

      expect(execFileMock).toHaveBeenCalledOnce();

      const stopArgs = execFileMock.mock.calls[0][1] as string[];

      expect(stopArgs.slice(0, -1)).toEqual([
        "exec",
        ...targetArgs,
        "--",
        "powershell",
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
      ]);
      expect(stopArgs.at(-1)).toContain(`'%${marker}%'`);
      expect(stopArgs.at(-1)).toContain("$_.ProcessId -ne $PID");
      expect(stopArgs.at(-1)).toContain("taskkill.exe /T /F /PID $_.ProcessId");
    });
  });

  describe("given an attach", () => {
    it("runs kubectl attach with an argument array", async () => {
      await open({ mode: "attach" });

      expect(spawnPtyMock.mock.calls[0][0]).toBe(kubectlPath);
      expect(spawnedArgs()).toEqual(["attach", "-i", "-t", ...targetArgs]);
    });

    it("only detaches when the tab closes: it kills the local kubectl, and neither writes to nor signals the container", async () => {
      await open({ mode: "attach" });

      fakePty.output(pidReport(1));
      close();

      expect(fakePty.pty.kill).toHaveBeenCalled();
      expect(fakePty.pty.write).not.toHaveBeenCalled();
      expect(execFileMock).not.toHaveBeenCalled();
    });
  });
});
