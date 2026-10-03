/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { computed } from "mobx";
import { WebSocketCloseEvent } from "../../../main/shell-session/shell-session";
import { debugRequest } from "../test-utils";
import { DebugContainerShellSession } from "./shell-session";

import type { IPty } from "node-pty";
import type WebSocket from "ws";

import type { Kubectl } from "../../../main/kubectl/kubectl";
import type { ShellSessionDependencies } from "../../../main/shell-session/shell-session";

describe("debugger terminal lifecycle", () => {
  it.each([false, true])(
    "executes kubectl directly and closes only its local terminal (Windows: %s)",
    async (isWindows) => {
      const socket = Object.assign(new EventEmitter(), { send: vi.fn() });
      const process = { onData: vi.fn(), onExit: vi.fn(), kill: vi.fn() };
      const spawnPty = vi.fn(() => process as unknown as IPty);
      const dependencies: ShellSessionDependencies = {
        isWindows,
        isMac: false,
        defaultShell: "sh",
        userShellSetting: computed(() => null),
        appName: "Freelens",
        buildVersion: "test",
        proxyKubeconfigPath: "path with spaces/kubeconfig",
        logger: { info: vi.fn(), warn: vi.fn() } as unknown as ShellSessionDependencies["logger"],
        shellSessionEnvs: new Map(),
        shellSessionProcesses: new Map(),
        computeShellEnvironment: vi.fn(async () => ({
          callWasSuccessful: true as const,
          response: { PATH: "/usr/bin" },
        })),
        spawnPty,
        emitAppEvent: vi.fn(),
        stat: vi.fn(),
      };
      const session = new DebugContainerShellSession(dependencies, {
        websocket: socket as unknown as WebSocket,
        tabId: "debug-tab",
        debugContainer: debugRequest,
        kubectl: { getPath: async () => "path with spaces/kubectl" } as Kubectl,
      });

      await session.open();
      expect(spawnPty).toHaveBeenCalledWith(
        "path with spaces/kubectl",
        [
          "--kubeconfig",
          "path with spaces/kubeconfig",
          "exec",
          "-i",
          "-t",
          "--namespace",
          "default",
          "app",
          "--container",
          "freelens-debug-123",
          "--",
          "sh",
          "-c",
          expect.stringContaining("exec sh"),
        ],
        expect.anything(),
      );
      socket.emit("close", WebSocketCloseEvent.NormalClosure);
      expect(process.kill).toHaveBeenCalledOnce();
      // No second command is launched to stop the independently running keepalive.
      expect(spawnPty).toHaveBeenCalledOnce();
      expect(dependencies.shellSessionProcesses.size).toBe(0);
    },
  );
});
