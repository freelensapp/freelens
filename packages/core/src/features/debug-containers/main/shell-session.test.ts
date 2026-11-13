/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { WebSocketCloseEvent } from "../../../main/shell-session/shell-session";
import { websocketClosedSignal } from "../../../main/shell-session/websocket-closed";
import { debugRequest } from "../test-utils";
import { DebugContainerShellSession } from "./shell-session";

import type { IPty } from "node-pty";
import type WebSocket from "ws";

import type { Kubectl } from "../../../main/kubectl/kubectl";
import type { ShellSessionDependencies } from "../../../main/shell-session/shell-session";

describe("debugger terminal lifecycle", () => {
  it.each([
    { isWindows: false, closeDuringEnvironment: false },
    { isWindows: true, closeDuringEnvironment: false },
    { isWindows: false, closeDuringEnvironment: true },
    { isWindows: true, closeDuringEnvironment: true },
  ])("keeps the debugger independent of its terminal: %j", async ({ isWindows, closeDuringEnvironment }) => {
    const socket = Object.assign(new EventEmitter(), { send: vi.fn() });
    const process = { onData: vi.fn(), onExit: vi.fn(), kill: vi.fn() };
    const spawnPty = vi.fn(() => process as unknown as IPty);
    const dependencies: ShellSessionDependencies = {
      isWindows,
      isMac: false,
      getUserShell: () => "sh",
      kubeTools: { kubectlPath: "path with spaces/kubectl", helmPath: "/helm", pathPrefix: [], pathSuffix: [] },
      freelensProxyToken: "test-proxy-token",
      appName: "Freelens",
      buildVersion: "test",
      proxyKubeconfigPath: "path with spaces/kubeconfig",
      proxyCacheDirectoryPath: "path with spaces/cache",
      logger: { info: vi.fn(), warn: vi.fn() } as unknown as ShellSessionDependencies["logger"],
      shellSessionEnvs: new Map(),
      shellSessionProcesses: new Map(),
      computeUserShellEnvironment: vi.fn(async () => {
        if (closeDuringEnvironment) socket.emit("close", WebSocketCloseEvent.NormalClosure);
        return { shell: "sh", environment: { PATH: "/usr/bin" } };
      }),
      spawnPty,
      emitAppEvent: vi.fn(),
      stat: vi.fn(),
    };
    const session = new DebugContainerShellSession(dependencies, {
      websocket: socket as unknown as WebSocket,
      signal: websocketClosedSignal(socket as unknown as WebSocket),
      tabId: "debug-tab",
      debugContainer: debugRequest,
      kubectl: { getPath: async () => "path with spaces/kubectl" } as Kubectl,
    });

    await session.open();
    if (closeDuringEnvironment) {
      expect(spawnPty).not.toHaveBeenCalled();
      return;
    }
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
      expect.objectContaining({
        env: expect.objectContaining({
          FREELENS_PROXY_TOKEN: "test-proxy-token",
          KUBECONFIG: "path with spaces/kubeconfig",
          KUBECACHEDIR: "path with spaces/cache",
        }),
      }),
    );
    socket.emit("close", WebSocketCloseEvent.NormalClosure);
    expect(process.kill).toHaveBeenCalledOnce();
    // No second command is launched to stop the independently running keepalive.
    expect(spawnPty).toHaveBeenCalledOnce();
    expect(dependencies.shellSessionProcesses.size).toBe(0);
  });
});
