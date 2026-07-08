/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

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
});
