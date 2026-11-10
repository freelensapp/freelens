/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, observable } from "mobx";
import { TerminalChannels } from "../../../common/terminal/channels";
import { WebSocketApiState } from "../../../renderer/api/websocket-api";

import type { CreateStandaloneTerminalApi } from "../../../renderer/api/create-standalone-terminal-api.injectable";
import type { TerminalApi } from "../../../renderer/api/terminal-api";
import type { CreateTerminal } from "../../../renderer/components/dock/terminal/create-terminal.injectable";
import type { Terminal } from "../../../renderer/components/dock/terminal/terminal";

interface Dependencies {
  createTerminal: CreateTerminal;
  createStandaloneTerminalApi: CreateStandaloneTerminalApi;
}

/**
 * Keeps the shells of the terminal page alive for as long as the app runs.
 * Navigating away only detaches the xterm element - a session is torn down
 * when, and only when, its tab is closed.
 */
export class StandaloneTerminalSessionStore {
  private readonly terminals = new Map<string, Terminal>();
  private readonly connections = observable.map<string, TerminalApi>();

  constructor(private readonly dependencies: Dependencies) {}

  @action
  connect(tabId: string) {
    if (this.isConnected(tabId)) {
      return;
    }

    const api = this.dependencies.createStandaloneTerminalApi(tabId);
    const terminal = this.dependencies.createTerminal(tabId, api);

    this.connections.set(tabId, api);
    this.terminals.set(tabId, terminal);

    api.connect();
  }

  @action
  destroy(tabId: string) {
    const terminal = this.terminals.get(tabId);
    const terminalApi = this.connections.get(tabId);

    if (terminalApi?.isReady) {
      terminalApi.sendMessage({
        type: TerminalChannels.STDIN,
        data: "exit\r",
      });
    }

    terminal?.destroy();
    terminalApi?.destroy();
    this.connections.delete(tabId);
    this.terminals.delete(tabId);
  }

  reconnect(tabId: string) {
    this.connections.get(tabId)?.connect();
  }

  isConnected(tabId: string) {
    return Boolean(this.connections.get(tabId));
  }

  isDisconnected(tabId: string) {
    return this.connections.get(tabId)?.readyState === WebSocketApiState.CLOSED;
  }

  getTerminal(tabId: string) {
    return this.terminals.get(tabId);
  }

  getTerminalApi(tabId: string) {
    return this.connections.get(tabId);
  }
}
