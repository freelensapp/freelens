/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable } from "mobx";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { SavedSearch } from "../../../features/user-preferences/common/preferences-helpers";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

/** The part of a saved search that is not its identity. */
type SavedSearchState = Pick<SavedSearch, "search" | "op" | "facets">;

/**
 * Named searches, persisted with the user's preferences.
 *
 * A search is identified by its view and its name, so saving over an existing
 * name replaces it - no ids to generate, and no way to end up with two entries
 * a user cannot tell apart.
 */
class SavedSearchesStore {
  constructor(private readonly userPreferencesState: UserPreferencesState) {
    makeObservable(this);
  }

  @computed
  private get all(): SavedSearch[] {
    return this.userPreferencesState.savedSearches ?? [];
  }

  /**
   * The searches offered on a view.
   *
   * Scoped per view because facets name fields: a search saved on Pods filters
   * on `status` and `node`, and on a view without those fields a positive facet
   * matches nothing. Offering it there would look broken rather than useful.
   */
  forView(view: string): SavedSearch[] {
    return this.all.filter((saved) => saved.view === view).sort((a, b) => a.name.localeCompare(b.name));
  }

  @action
  save(view: string, name: string, state: SavedSearchState) {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const others = this.all.filter((saved) => !(saved.view === view && saved.name === trimmed));

    this.userPreferencesState.savedSearches = [...others, { view, name: trimmed, ...state }];
  }

  @action
  remove(view: string, name: string) {
    this.userPreferencesState.savedSearches = this.all.filter((saved) => !(saved.view === view && saved.name === name));
  }
}

const savedSearchesStoreInjectable = getInjectable({
  id: "saved-searches-store",
  instantiate: (di) => new SavedSearchesStore(di.inject(userPreferencesStateInjectable)),
});

export default savedSearchesStoreInjectable;
