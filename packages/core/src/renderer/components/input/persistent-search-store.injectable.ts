/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable, observable } from "mobx";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

/**
 * Store for managing persistent search across views within the same namespace.
 * Search values are stored per-namespace and only in memory (session-only).
 */
class PersistentSearchStore {
  @observable private searchValuesByNamespace = new Map<string, string>();

  constructor(private readonly userPreferencesState: UserPreferencesState) {
    makeObservable(this);
  }

  @computed
  get isEnabled(): boolean {
    return this.userPreferencesState.persistentSearch ?? false;
  }

  @action
  setEnabled(enabled: boolean) {
    this.userPreferencesState.persistentSearch = enabled;
  }

  @action
  setValue(namespace: string, value: string) {
    this.searchValuesByNamespace.set(namespace, value);
  }

  getValue(namespace: string): string {
    return this.searchValuesByNamespace.get(namespace) || "";
  }
}

const persistentSearchStoreInjectable = getInjectable({
  id: "persistent-search-store",
  instantiate: (di) => new PersistentSearchStore(di.inject(userPreferencesStateInjectable)),
});

export default persistentSearchStoreInjectable;
