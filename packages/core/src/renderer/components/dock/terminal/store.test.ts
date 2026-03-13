/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { TerminalChannels } from "../../../../common/terminal/channels";
import { TerminalStore } from "./store";

describe("TerminalStore", () => {
  it("sends exit and destroys resources when terminal is ready", () => {
    const sendMessage = jest.fn();
    const apiDestroy = jest.fn();
    const terminalDestroy = jest.fn();

    const terminalApi = {
      isReady: true,
      sendMessage,
      destroy: apiDestroy,
    } as any;

    const terminal = {
      destroy: terminalDestroy,
    } as any;

    const store = new TerminalStore({
      createTerminalApi: jest.fn(),
      createTerminal: jest.fn(),
    });

    (store as any).connections.set("tab-id", terminalApi);
    (store as any).terminals.set("tab-id", terminal);

    store.destroy("tab-id");

    expect(sendMessage).toHaveBeenCalledWith({
      type: TerminalChannels.STDIN,
      data: "exit\r",
    });
    expect(terminalDestroy).toHaveBeenCalled();
    expect(apiDestroy).toHaveBeenCalled();
    expect((store as any).connections.has("tab-id")).toBe(false);
    expect((store as any).terminals.has("tab-id")).toBe(false);
  });

  it("does not send exit when terminal is not ready", () => {
    const sendMessage = jest.fn();
    const apiDestroy = jest.fn();
    const terminalDestroy = jest.fn();

    const terminalApi = {
      isReady: false,
      sendMessage,
      destroy: apiDestroy,
    } as any;

    const terminal = {
      destroy: terminalDestroy,
    } as any;

    const store = new TerminalStore({
      createTerminalApi: jest.fn(),
      createTerminal: jest.fn(),
    });

    (store as any).connections.set("tab-id", terminalApi);
    (store as any).terminals.set("tab-id", terminal);

    store.destroy("tab-id");

    expect(sendMessage).not.toHaveBeenCalled();
    expect(terminalDestroy).toHaveBeenCalled();
    expect(apiDestroy).toHaveBeenCalled();
  });
});
