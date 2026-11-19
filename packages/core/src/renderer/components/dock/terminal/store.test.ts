/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import { TerminalChannels } from "../../../../common/terminal/channels";
import { TabKind } from "../dock/store";
import { TerminalStore } from "./store";

describe("TerminalStore", () => {
  const tabId = "tab-id";

  it("sends exit and destroys resources when terminal is ready", () => {
    const sendMessage = vi.fn();
    const apiConnect = vi.fn();
    const apiDestroy = vi.fn();
    const terminalDestroy = vi.fn();

    const terminalApi = {
      isReady: true,
      connect: apiConnect,
      sendMessage,
      destroy: apiDestroy,
    } as any;

    const terminal = {
      destroy: terminalDestroy,
    } as any;

    const store = new TerminalStore({
      createTerminalApi: vi.fn(() => terminalApi),
      createTerminal: vi.fn(() => terminal),
    });

    store.connect({ id: tabId, kind: TabKind.TERMINAL, title: "Terminal", pinned: false });

    expect(apiConnect).toHaveBeenCalled();

    store.destroy(tabId);

    expect(sendMessage).toHaveBeenCalledWith({
      type: TerminalChannels.STDIN,
      data: "exit\r",
    });
    expect(terminalDestroy).toHaveBeenCalled();
    expect(apiDestroy).toHaveBeenCalled();
    expect(store.getTerminalApi(tabId)).toBeUndefined();
    expect(store.getTerminal(tabId)).toBeUndefined();
  });

  it("does not send exit when terminal is not ready", () => {
    const sendMessage = vi.fn();
    const apiConnect = vi.fn();
    const apiDestroy = vi.fn();
    const terminalDestroy = vi.fn();

    const terminalApi = {
      isReady: false,
      connect: apiConnect,
      sendMessage,
      destroy: apiDestroy,
    } as any;

    const terminal = {
      destroy: terminalDestroy,
    } as any;

    const store = new TerminalStore({
      createTerminalApi: vi.fn(() => terminalApi),
      createTerminal: vi.fn(() => terminal),
    });

    store.connect({ id: tabId, kind: TabKind.TERMINAL, title: "Terminal", pinned: false });

    expect(apiConnect).toHaveBeenCalled();

    store.destroy(tabId);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(terminalDestroy).toHaveBeenCalled();
    expect(apiDestroy).toHaveBeenCalled();
    expect(store.getTerminalApi(tabId)).toBeUndefined();
    expect(store.getTerminal(tabId)).toBeUndefined();
  });

  it("does not send exit to a debug container, which closing its tab leaves running", () => {
    const sendMessage = vi.fn();
    const apiDestroy = vi.fn();
    const createTerminalApi = vi.fn(
      () => ({ isReady: true, connect: vi.fn(), sendMessage, destroy: apiDestroy }) as any,
    );
    const store = new TerminalStore({
      createTerminalApi,
      createTerminal: vi.fn(() => ({ destroy: vi.fn() }) as any),
    });

    store.connect({
      id: tabId,
      kind: TabKind.TERMINAL,
      title: "Debug",
      pinned: false,
      debugContainer: {
        namespace: "default",
        pod: "app",
        podUid: "pod-uid",
        container: "freelens-debug-123",
        image: "alpine",
        target: "app",
      },
    });
    expect(createTerminalApi).toHaveBeenCalledWith(expect.objectContaining({ type: "debug-container", pod: "app" }));

    store.destroy(tabId);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(apiDestroy).toHaveBeenCalled();
  });
});
