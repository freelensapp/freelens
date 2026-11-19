/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import { TabKind } from "../dock/store";
import { TerminalStore } from "./store";

describe("TerminalStore", () => {
  const tabId = "tab-id";

  const createStore = ({ isReady }: { isReady: boolean }) => {
    const terminalApi = {
      isReady,
      connect: vi.fn(),
      sendMessage: vi.fn(),
      destroy: vi.fn(),
    };
    const terminal = {
      destroy: vi.fn(),
    };
    const createTerminalApi = vi.fn(() => terminalApi as any);
    const store = new TerminalStore({
      createTerminalApi,
      createTerminal: vi.fn(() => terminal as any),
    });

    return { store, terminalApi, terminal, createTerminalApi };
  };

  it.each([true, false])(
    "destroys the resources of the tab without writing to its input when the terminal ready is %s",
    (isReady) => {
      const { store, terminalApi, terminal } = createStore({ isReady });

      store.connect({ id: tabId, kind: TabKind.TERMINAL, title: "Terminal", pinned: false });

      expect(terminalApi.connect).toHaveBeenCalled();

      store.destroy(tabId);

      expect(terminalApi.sendMessage).not.toHaveBeenCalled();
      expect(terminal.destroy).toHaveBeenCalled();
      expect(terminalApi.destroy).toHaveBeenCalled();
      expect(store.getTerminalApi(tabId)).toBeUndefined();
      expect(store.getTerminal(tabId)).toBeUndefined();
    },
  );

  it("asks main for a pod terminal for a tab of a pod", () => {
    const { store, terminalApi, createTerminalApi } = createStore({ isReady: true });

    store.connect({
      id: tabId,
      kind: TabKind.TERMINAL,
      title: "Pod",
      pinned: false,
      podTerminal: { mode: "exec", namespace: "default", pod: "app", container: "main" },
    });

    expect(createTerminalApi).toHaveBeenCalledWith({
      id: tabId,
      node: undefined,
      type: "pod-exec",
      namespace: "default",
      pod: "app",
      container: "main",
      os: undefined,
    });

    store.destroy(tabId);

    expect(terminalApi.sendMessage).not.toHaveBeenCalled();
  });

  it("asks main for a debug container for a debug tab", () => {
    const { store, terminalApi, createTerminalApi } = createStore({ isReady: true });

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

    expect(terminalApi.sendMessage).not.toHaveBeenCalled();
    expect(terminalApi.destroy).toHaveBeenCalled();
  });
});
