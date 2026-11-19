/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, observable } from "mobx";
import { debugContainerQuery } from "../../../../features/debug-containers/common/debug-container";
import { podTerminalQuery } from "../../../../features/pod-terminal/common/pod-terminal";
import { WebSocketApiState } from "../../../api/websocket-api";

import type { DebugContainerSpec } from "../../../../features/debug-containers/common/debug-container";
import type { PodTerminalTarget } from "../../../../features/pod-terminal/common/pod-terminal";
import type { CreateTerminalApi } from "../../../api/create-terminal-api.injectable";
import type { TerminalApi } from "../../../api/terminal-api";
import type { DockTab, TabId } from "../dock/store";
import type { CreateTerminal } from "./create-terminal.injectable";
import type { Terminal } from "./terminal";

export interface ITerminalTab extends DockTab {
  node?: string; // activate node shell mode
  /**
   * The container of a pod, for a tab opened by the Shell or the Attach menu
   * of a pod.
   */
  podTerminal?: PodTerminalTarget;
  /**
   * The ephemeral container of a tab opened by the Debug menu of a pod.
   */
  debugContainer?: DebugContainerSpec;
}

interface Dependencies {
  createTerminal: CreateTerminal;
  createTerminalApi: CreateTerminalApi;
}

export class TerminalStore {
  protected terminals = new Map<TabId, Terminal>();
  protected connections = observable.map<TabId, TerminalApi>();

  constructor(private dependencies: Dependencies) {}

  @action
  connect(tab: ITerminalTab) {
    if (this.isConnected(tab.id)) {
      return;
    }
    const api = this.dependencies.createTerminalApi({
      id: tab.id,
      node: tab.node,
      ...(tab.podTerminal ? podTerminalQuery(tab.podTerminal) : {}),
      ...(tab.debugContainer ? debugContainerQuery(tab.debugContainer) : {}),
    });
    const terminal = this.dependencies.createTerminal(tab.id, api);

    this.connections.set(tab.id, api);
    this.terminals.set(tab.id, terminal);

    api.connect();
  }

  /**
   * Disconnects the tab without writing anything to its input: whatever has
   * to end with the tab, the session in main ends when the connection closes.
   */
  @action
  destroy(tabId: TabId) {
    const terminal = this.terminals.get(tabId);
    const terminalApi = this.connections.get(tabId);

    terminal?.destroy();
    terminalApi?.destroy();
    this.connections.delete(tabId);
    this.terminals.delete(tabId);
  }

  /**
   * @deprecated use `this.destroy()` instead
   */
  disconnect(tabId: TabId) {
    this.destroy(tabId);
  }

  reconnect(tabId: TabId) {
    this.connections.get(tabId)?.connect();
  }

  isConnected(tabId: TabId) {
    return Boolean(this.connections.get(tabId));
  }

  isDisconnected(tabId: TabId) {
    return this.connections.get(tabId)?.readyState === WebSocketApiState.CLOSED;
  }

  getTerminal(tabId: TabId) {
    return this.terminals.get(tabId);
  }

  getTerminalApi(tabId: TabId) {
    return this.connections.get(tabId);
  }

  reset() {
    [...this.connections].forEach(([tabId]) => {
      this.destroy(tabId);
    });
  }
}
