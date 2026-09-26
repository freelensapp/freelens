/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import persistentSearchStoreInjectable from "./persistent-search-store.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("persistent search store", () => {
  let di: DiContainer;
  let persistentSearchStore: ReturnType<typeof persistentSearchStoreInjectable.instantiate>;
  let userPreferencesState: Record<string, unknown>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    persistentSearchStore = di.inject(persistentSearchStoreInjectable);
    userPreferencesState = di.inject(userPreferencesStateInjectable) as Record<string, unknown>;
  });

  it("defaults to disabled when no stored preference exists", () => {
    expect(persistentSearchStore.isEnabled).toBe(false);
  });

  it("persists enabling through user preferences state", () => {
    persistentSearchStore.setEnabled(true);

    expect(userPreferencesState.persistentSearch).toBe(true);
  });

  it("persists disabling through user preferences state", () => {
    persistentSearchStore.setEnabled(true);
    persistentSearchStore.setEnabled(false);

    expect(userPreferencesState.persistentSearch).toBe(false);
  });

  it("keeps the search session-only and out of user preferences", () => {
    const sharedSearchKey = "global:linked";
    const stored = { search: "pods", op: "", facets: "" };

    persistentSearchStore.setEnabled(true);
    const userPreferencesBeforeSettingValue = { ...userPreferencesState };
    persistentSearchStore.setValue(sharedSearchKey, stored);

    expect(persistentSearchStore.getValue(sharedSearchKey)).toEqual(stored);
    expect(userPreferencesState.persistentSearch).toBe(true);
    expect(userPreferencesState[sharedSearchKey]).toBeUndefined();
    expect({ ...userPreferencesState }).toEqual(userPreferencesBeforeSettingValue);
  });

  it("reports an empty search for a key it has never seen", () => {
    expect(persistentSearchStore.getValue("nothing:here")).toEqual({ search: "", op: "", facets: "" });
  });

  // Carrying only the text was what turned a faceted search into a bare query
  // on navigating away and back.
  it("keeps the operator and the facets alongside the text", () => {
    const stored = { search: "nginx", op: "notContains", facets: '[{"field":"status","values":["Failed"]}]' };

    persistentSearchStore.setValue("global:linked", stored);

    expect(persistentSearchStore.getValue("global:linked")).toEqual(stored);
  });
});
