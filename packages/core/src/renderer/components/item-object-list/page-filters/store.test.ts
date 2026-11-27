/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { FilterType } from "./store";
import pageFiltersStoreInjectable from "./store.injectable";

import type { ObservableHistory } from "@freelensapp/routing";

import type { PageFiltersStore } from "./store";

describe("PageFiltersStore", () => {
  let store: PageFiltersStore;
  let history: ObservableHistory<unknown>;

  const query = () => Object.fromEntries(history.searchParams.entries());

  beforeEach(() => {
    const di = getDiForUnitTesting();

    history = di.inject(observableHistoryInjectionToken);
    history.push("/pods?node=node-a&search=web");
    store = di.inject(pageFiltersStoreInjectable);
  });

  it("takes the node and the search filters from the URL", () => {
    expect(store.activeFilters).toEqual(
      expect.arrayContaining([
        { type: FilterType.NODE, value: "node-a" },
        { type: FilterType.SEARCH, value: "web" },
      ]),
    );
    expect(store.activeFilters).toHaveLength(2);
  });

  it("follows the node in the URL", () => {
    history.push("/pods?node=node-b");

    expect(store.getValues(FilterType.NODE)).toEqual(["node-b"]);
    expect(store.getValues(FilterType.SEARCH)).toEqual([]);
  });

  it("puts a node filter that is added into the URL", () => {
    history.push("/pods");
    store.addFilter({ type: FilterType.NODE, value: "node-c" });

    expect(query()).toEqual({ node: "node-c" });
  });

  it("clears only the node from the URL when the node filter is removed", () => {
    store.removeFilter({ type: FilterType.NODE, value: "node-a" });

    expect(query()).toEqual({ search: "web" });
    expect(store.getValues(FilterType.SEARCH)).toEqual(["web"]);
  });

  it("clears only the search from the URL when the search filter is removed", () => {
    store.removeFilter({ type: FilterType.SEARCH, value: "web" });

    expect(query()).toEqual({ node: "node-a" });
    expect(store.getValues(FilterType.NODE)).toEqual(["node-a"]);
  });

  it("clears the node and the search from the URL on reset", () => {
    store.reset();

    expect(query()).toEqual({});
    expect(store.activeFilters).toEqual([]);
  });
});
