/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import persistentSearchStoreInjectable from "./persistent-search-store.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("persistent search store", () => {
  let di: DiContainer;
  let persistentSearchStore: ReturnType<typeof persistentSearchStoreInjectable.instantiate>;
  let userPreferencesState: Record<string, unknown>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.register(persistentSearchStoreInjectable);
    persistentSearchStore = di.inject(persistentSearchStoreInjectable);
    userPreferencesState = di.inject(userPreferencesStateInjectable) as Record<string, unknown>;
  });

  it("defaults to disabled when no stored preference exists", () => {
    expect(persistentSearchStore.isEnabled).toBe(false);
    expect(persistentSearchStore.getEnabled()).toBe(false);
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

  it("keeps search text session-only and out of user preferences", () => {
    const sharedSearchKey = "global:linked";

    persistentSearchStore.setEnabled(true);
    const userPreferencesBeforeSettingValue = { ...userPreferencesState };
    persistentSearchStore.setValue(sharedSearchKey, "pods");

    expect(persistentSearchStore.getValue(sharedSearchKey)).toBe("pods");
    expect(userPreferencesState.persistentSearch).toBe(true);
    expect(userPreferencesState[sharedSearchKey]).toBeUndefined();
    expect({ ...userPreferencesState }).toEqual(userPreferencesBeforeSettingValue);
  });
});
