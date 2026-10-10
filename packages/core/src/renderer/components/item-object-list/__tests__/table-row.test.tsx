/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import { NonInjectedItemListLayoutContent } from "../content";

import type { ItemObject } from "@freelensapp/list-layout";

import type { ItemListLayoutContentProps } from "../content";

const makeItem = (id: string): ItemObject => ({
  getId: () => id,
  getName: () => `name-${id}`,
});

const items = [makeItem("uid-1"), makeItem("uid-2")];

const props = {
  getFilters: () => [],
  className: "",
  getItems: () => items,
  store: {
    isSelected: () => false,
    toggleSelection: () => {},
  },
  getIsReady: () => true,
  renderTableContents: (item: ItemObject) => [item.getName()],
  columnResizeStorage: { get: () => ({}) },
  isTableColumnHidden: vi.fn(),
} as unknown as ConstructorParameters<typeof NonInjectedItemListLayoutContent>[0] &
  ItemListLayoutContentProps<ItemObject, boolean>;

describe("<ItemListLayoutContent> rows", () => {
  // With virtual={false}, <Table> renders the rows renderRow returns as a list,
  // so each one needs a key of its own.
  it("gives the row of a non-virtual list the id of its item as key", () => {
    const component = new NonInjectedItemListLayoutContent(props);

    expect(items.map((item) => component.renderRow(item).key)).toEqual(["uid-1", "uid-2"]);
  });
});
