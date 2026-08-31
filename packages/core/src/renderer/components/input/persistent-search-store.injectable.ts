/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable, observable } from "mobx";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

/**
 * A whole search, as the three URL params that express it.
 *
 * Navigating to another view pushes a path with no query, so all three are lost
 * and have to be restored from here. Keeping only the text - which is all this
 * store held before facets existed - brought a query back without its facets,
 * leaving text in the box that no longer filtered anything.
 */
export interface PersistedSearch {
  search: string;
  op: string;
  facets: string;
}

const emptyPersistedSearch: PersistedSearch = { search: "", op: "", facets: "" };

export const isEmptySearch = (state: PersistedSearch) => state.search === "" && state.op === "" && state.facets === "";

/**
 * Store for managing persistent search across views within the same namespace.
 * Search values are stored per-namespace and only in memory (session-only).
 */
class PersistentSearchStore {
  @observable private searchValuesByNamespace = new Map<string, PersistedSearch>();

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
  setValue(namespace: string, value: PersistedSearch) {
    this.searchValuesByNamespace.set(namespace, value);
  }

  getValue(namespace: string): PersistedSearch {
    return this.searchValuesByNamespace.get(namespace) ?? emptyPersistedSearch;
  }
}

const persistentSearchStoreInjectable = getInjectable({
  id: "persistent-search-store",
  instantiate: (di) => new PersistentSearchStore(di.inject(userPreferencesStateInjectable)),
});

export default persistentSearchStoreInjectable;
