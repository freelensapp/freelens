/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { autorun, observable, runInAction } from "mobx";
import { describe, expect, it, vi } from "vitest";
import { NonInjectedItemListLayout } from "../list-layout";
import { PageFiltersStore } from "../page-filters/store";

import type { ItemObject } from "@freelensapp/list-layout";

import type { PageParam } from "../../../navigation/page-param";

type Layout = NonInjectedItemListLayout<ItemObject, boolean>;
type LayoutProps = ConstructorParameters<typeof NonInjectedItemListLayout<ItemObject, boolean>>[0];

const makeItem = (id: string): ItemObject => ({
  getId: () => id,
  getName: () => `item-${id}`,
});

const makeItems = (count: number) => Array.from({ length: count }, (_, index) => makeItem(`uid-${index}`));

// The content renders every row in an <Observer> of its own, and each of them
// reads the items of the layout: a list on the screen is as many derivations
// reading the items as the rows it shows.
const ROWS = 27;

const makeLayout = (getItems: () => ItemObject[]) => {
  const search = observable.box("");
  const searchUrlParam = {
    get: () => search.get(),
    set: (value: string) => search.set(value),
  } as unknown as PageParam<string>;
  const filterItems = vi.fn((items: ItemObject[]) => items);
  const getSearchTexts = vi.fn((item: ItemObject) => item.getName());
  const props = {
    className: "",
    getItems,
    store: { isLoaded: true },
    searchFilters: [getSearchTexts],
    filterItems: [filterItems],
    renderTableContents: () => [],
    pageFiltersStore: new PageFiltersStore({ searchUrlParam }),
  } as unknown as LayoutProps;
  const layout = new NonInjectedItemListLayout(props);

  return { layout, props, search, filterItems, getSearchTexts };
};

const readInRows = (layout: Layout) => {
  const seen: string[][] = [];
  const disposers = Array.from({ length: ROWS }, (_, row) =>
    autorun(() => {
      seen[row] = layout.items.map((item) => item.getId());
    }),
  );

  return { seen, dispose: () => disposers.forEach((dispose) => dispose()) };
};

const everyRow = (ids: string[]) => Array.from({ length: ROWS }, () => ids);

describe("<ItemListLayout> items", () => {
  it("filters the items once for all the rows that read them", () => {
    const items = makeItems(1000);
    const { layout, filterItems } = makeLayout(() => items);
    const rows = readInRows(layout);

    expect(filterItems).toHaveBeenCalledTimes(1);
    expect(rows.seen.every((ids) => ids.length === 1000)).toBe(true);

    rows.dispose();
  });

  it("filters them once again when the search changes, and every row sees the new items", () => {
    const items = makeItems(1000);
    const { layout, search, filterItems, getSearchTexts } = makeLayout(() => items);
    const rows = readInRows(layout);

    filterItems.mockClear();
    getSearchTexts.mockClear();
    runInAction(() => search.set("uid-999"));

    expect(filterItems).toHaveBeenCalledTimes(1);
    expect(getSearchTexts).toHaveBeenCalledTimes(1000);
    expect(rows.seen).toEqual(everyRow(["uid-999"]));

    rows.dispose();
  });

  it("filters them once again when the store changes, and every row sees the new items", () => {
    const store = observable.array(makeItems(2), { deep: false });
    const { layout, filterItems } = makeLayout(() => store.slice());
    const rows = readInRows(layout);

    filterItems.mockClear();
    runInAction(() => store.push(makeItem("uid-2")));

    expect(filterItems).toHaveBeenCalledTimes(1);
    expect(rows.seen).toEqual(everyRow(["uid-0", "uid-1", "uid-2"]));

    rows.dispose();
  });

  it("takes the items of the props of an update", () => {
    const { layout, props, filterItems } = makeLayout(() => makeItems(2));
    const rows = readInRows(layout);
    const nextItems = makeItems(3);

    filterItems.mockClear();
    expect(Reflect.set(layout, "props", { ...props, getItems: () => nextItems })).toBe(true);
    layout.componentDidUpdate();

    expect(filterItems).toHaveBeenCalledTimes(1);
    expect(rows.seen).toEqual(everyRow(["uid-0", "uid-1", "uid-2"]));

    rows.dispose();
  });
});
