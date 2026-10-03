/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import savedSearchesStoreInjectable from "./saved-searches-store.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("saved searches store", () => {
  let di: DiContainer;
  let store: ReturnType<typeof savedSearchesStoreInjectable.instantiate>;

  const state = (search: string, facets = "", op = "") => ({ search, op, facets });

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/some-user-store-path");
    store = di.inject(savedSearchesStoreInjectable);
  });

  it("starts empty", () => {
    expect(store.forView("/pods")).toEqual([]);
  });

  it("keeps a saved search for its view", () => {
    store.save("/pods", "Broken", state("", '[{"field":"status","values":["Failed"]}]'));

    expect(store.forView("/pods")).toEqual([
      { view: "/pods", name: "Broken", search: "", op: "", facets: '[{"field":"status","values":["Failed"]}]' },
    ]);
  });

  // A search saved on Pods filters on fields another view does not have, where
  // a positive facet matches nothing. Offering it there would look broken.
  it("does not offer it on another view", () => {
    store.save("/pods", "Broken", state("", '[{"field":"status","values":["Failed"]}]'));

    expect(store.forView("/deployments")).toEqual([]);
  });

  it("keeps the same name on two views apart", () => {
    store.save("/pods", "Mine", state("a"));
    store.save("/deployments", "Mine", state("b"));

    expect(store.forView("/pods")[0]?.search).toBe("a");
    expect(store.forView("/deployments")[0]?.search).toBe("b");
  });

  it("replaces a search saved again under the same name", () => {
    store.save("/pods", "Mine", state("first"));
    store.save("/pods", "Mine", state("second"));

    expect(store.forView("/pods")).toEqual([{ view: "/pods", name: "Mine", search: "second", op: "", facets: "" }]);
  });

  it("sorts by name so the list does not reorder as searches are added", () => {
    store.save("/pods", "Zulu", state("z"));
    store.save("/pods", "Alpha", state("a"));
    store.save("/pods", "Mike", state("m"));

    expect(store.forView("/pods").map(({ name }) => name)).toEqual(["Alpha", "Mike", "Zulu"]);
  });

  it("trims the name and ignores a blank one", () => {
    store.save("/pods", "  Padded  ", state("a"));
    store.save("/pods", "   ", state("b"));

    expect(store.forView("/pods").map(({ name }) => name)).toEqual(["Padded"]);
  });

  it("removes only the named search", () => {
    store.save("/pods", "Keep", state("a"));
    store.save("/pods", "Drop", state("b"));

    store.remove("/pods", "Drop");

    expect(store.forView("/pods").map(({ name }) => name)).toEqual(["Keep"]);
  });

  it("leaves the same name on another view when removing", () => {
    store.save("/pods", "Mine", state("a"));
    store.save("/deployments", "Mine", state("b"));

    store.remove("/pods", "Mine");

    expect(store.forView("/pods")).toEqual([]);
    expect(store.forView("/deployments").map(({ name }) => name)).toEqual(["Mine"]);
  });

  it("writes through to the preference that persists it", () => {
    store.save("/pods", "Mine", state("a"));

    expect(di.inject(userPreferencesStateInjectable).savedSearches).toHaveLength(1);
  });
});
