/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { action, computed, makeObservable } from "mobx";

import type { StorageLayer } from "../../../renderer/utils/storage-helper";

export interface StandaloneTerminalTab {
  id: string;
  title: string;
}

export interface StandaloneTerminalTabsState {
  tabs: StandaloneTerminalTab[];
  selectedTabId?: string;
}

interface Dependencies {
  readonly storage: StorageLayer<StandaloneTerminalTabsState>;
  createTabId: () => string;
}

/**
 * The list of terminal tabs, persisted per app rather than per cluster. Only
 * the list is persisted: the shells themselves are kept by
 * {@link StandaloneTerminalSessionStore} for as long as the app runs, and by
 * the main process for as long as their PTY lives.
 */
export class StandaloneTerminalTabsStore {
  constructor(private readonly dependencies: Dependencies) {
    makeObservable(this);
  }

  @computed get tabs(): StandaloneTerminalTab[] {
    return this.dependencies.storage.get().tabs;
  }

  @computed get selectedTab(): StandaloneTerminalTab | undefined {
    const { selectedTabId } = this.dependencies.storage.get();

    return this.tabs.find((tab) => tab.id === selectedTabId) ?? this.tabs[0];
  }

  @action
  select(tabId: string) {
    this.dependencies.storage.merge({ selectedTabId: tabId });
  }

  @action
  add(): StandaloneTerminalTab {
    const tab = {
      id: this.dependencies.createTabId(),
      title: `Terminal ${this.tabs.length + 1}`,
    };

    this.dependencies.storage.merge((state) => {
      state.tabs.push(tab);
      state.selectedTabId = tab.id;
    });

    return tab;
  }

  @action
  close(tabId: string) {
    const closedIndex = this.tabs.findIndex((tab) => tab.id === tabId);

    if (closedIndex < 0) {
      return;
    }

    this.dependencies.storage.merge((state) => {
      state.tabs.splice(closedIndex, 1);

      if (state.selectedTabId === tabId) {
        // the neighbour that took its place, or the one before it
        state.selectedTabId = (state.tabs[closedIndex] ?? state.tabs[closedIndex - 1])?.id;
      }
    });
  }

  /**
   * The page is never empty: opening it with no tabs left opens one.
   */
  @action
  ensureTab(): StandaloneTerminalTab {
    return this.selectedTab ?? this.add();
  }
}
