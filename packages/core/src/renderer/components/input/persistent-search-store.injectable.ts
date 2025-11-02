/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable, observable } from "mobx";

/**
 * Store for managing persistent search across views within the same namespace.
 * Search values are stored per-namespace and only in memory (session-only).
 */
class PersistentSearchStore {
  @observable private isEnabledFlag = false;
  @observable private searchValuesByNamespace = new Map<string, string>();

  constructor() {
    makeObservable(this);
  }

  @computed
  get isEnabled(): boolean {
    return this.isEnabledFlag;
  }

  @action
  setEnabled(enabled: boolean) {
    this.isEnabledFlag = enabled;
  }

  @action
  setValue(namespace: string, value: string) {
    this.searchValuesByNamespace.set(namespace, value);
  }

  getValue(namespace: string): string {
    if (!this.isEnabled) {
      return "";
    }

    return this.searchValuesByNamespace.get(namespace) || "";
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }
}

const persistentSearchStoreInjectable = getInjectable({
  id: "persistent-search-store",
  instantiate: () => new PersistentSearchStore(),
});

export default persistentSearchStoreInjectable;
