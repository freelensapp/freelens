/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Observer } from "mobx-react";
import React from "react";
import { describe, expect, it } from "vitest";
import { ItemStore } from "../../../../common/item.store";
import { AddRemoveButtons } from "../../add-remove-buttons";
import { NonInjectedItemListLayoutContent } from "../content";

import type { ItemObject } from "@freelensapp/list-layout";

import type { AddRemoveButtonsProps } from "../../add-remove-buttons";
import type { ItemListLayoutContentProps } from "../content";

const makeItem = (id: string): ItemObject => ({
  getId: () => id,
  getName: () => `name-${id}`,
});

const selectedItem = makeItem("uid-1");
const items = [selectedItem, makeItem("uid-2")];

class RemovableStore extends ItemStore<ItemObject> {
  async removeItems() {}
}

const makeProps = (isSelectable: boolean) => {
  // The selection is kept in the store, so a list can find in it an item that
  // another list of the same kind selected.
  const store = new RemovableStore();

  store.select(selectedItem);

  return {
    getFilters: () => [],
    className: "",
    getItems: () => items,
    store,
    getIsReady: () => true,
    isSelectable,
    renderTableContents: (item: ItemObject) => [item.getName()],
    activeTheme: { get: () => ({ type: "dark" }) },
  } as unknown as ConstructorParameters<typeof NonInjectedItemListLayoutContent>[0] &
    ItemListLayoutContentProps<ItemObject, boolean>;
};

// The buttons at the bottom of the list: render() ends with an <Observer> that
// renders <AddRemoveButtons>, which shows a button for each handler it gets.
const renderButtons = (isSelectable: boolean) => {
  const content = new NonInjectedItemListLayoutContent(makeProps(isSelectable)).render();
  const observer = React.Children.toArray(content.props.children).find(
    (child) => React.isValidElement(child) && child.type === Observer,
  ) as React.ReactElement<{ children: () => React.ReactElement<AddRemoveButtonsProps> }>;

  return new AddRemoveButtons(observer.props.children().props)
    .renderButtons()
    .map(({ props }) => ({ className: props.className, tooltip: props.tooltip }));
};

describe("<ItemListLayoutContent> remove button", () => {
  it("is not shown on a list without checkboxes, although its store holds a selected item", () => {
    expect(renderButtons(false)).toEqual([]);
  });

  // isSelectable is true unless a list says otherwise: <ItemListLayout> has it
  // in its default props.
  it("is shown with its tooltip on a list with checkboxes whose store holds a selected item", () => {
    expect(renderButtons(true)).toEqual([{ className: "remove-button", tooltip: "Remove selected items (1)" }]);
  });
});
