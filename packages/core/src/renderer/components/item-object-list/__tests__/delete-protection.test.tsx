/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";

import React from "react";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { ItemListLayoutContent } from "../content";

import type { ItemObject } from "@freelensapp/list-layout";

import type { DiContainer } from "@ogre-tools/injectable";

import type { DiRender } from "../../test-utils/renderFor";
import type { ItemListLayoutContentProps } from "../content";

interface TestItem extends ItemObject {
  name: string;
}

const createTestItem = (id: string, name: string): TestItem => ({
  getId: () => id,
  getName: () => name,
  name,
});

describe("ItemListLayoutContent delete protection", () => {
  let di: DiContainer;
  let render: DiRender;

  beforeEach(() => {
    di = getDiForUnitTesting();
    render = renderFor(di);
  });

  const createProps = (): ItemListLayoutContentProps<TestItem, false> => {
    const items = [createTestItem("1", "item-1"), createTestItem("2", "item-2")];
    const selectedItems = [items[0]];

    return {
      getFilters: () => [],
      tableId: "test-table",
      className: "test-class",
      getItems: () => items,
      store: {
        isLoaded: true,
        failedLoading: false,
        getTotalCount: () => items.length,
        isSelected: (item) => selectedItems.includes(item),
        toggleSelection: jest.fn(),
        isSelectedAll: () => false,
        toggleSelectionAll: jest.fn(),
        pickOnlySelected: () => selectedItems,
        removeItems: jest.fn(),
        selectedItems,
      },
      getIsReady: () => true,
      renderTableContents: (item) => [item.name],
      renderTableHeader: [{ title: "Name", className: "name", id: "name" }],
    };
  };

  describe("given delete is allowed (allowDelete is true)", () => {
    beforeEach(() => {
      di.override(userPreferencesStateInjectable, () => ({
        allowDelete: true,
      }));
    });

    it("shows the remove button when items are selected", () => {
      const props = createProps();

      render(<ItemListLayoutContent {...props} />);

      const removeButton = document.querySelector(".remove-button");
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe("given delete is not allowed (allowDelete is false)", () => {
    beforeEach(() => {
      di.override(userPreferencesStateInjectable, () => ({
        allowDelete: false,
      }));
    });

    it("does not show the remove button even when items are selected", () => {
      const props = createProps();

      render(<ItemListLayoutContent {...props} />);

      const removeButton = document.querySelector(".remove-button");
      expect(removeButton).not.toBeInTheDocument();
    });
  });

  describe("given delete preference is not set (allowDelete is undefined)", () => {
    beforeEach(() => {
      di.override(userPreferencesStateInjectable, () => ({
        allowDelete: undefined as unknown as boolean,
      }));
    });

    it("shows the remove button by default (undefined is treated as true)", () => {
      const props = createProps();

      render(<ItemListLayoutContent {...props} />);

      const removeButton = document.querySelector(".remove-button");
      expect(removeButton).toBeInTheDocument();
    });
  });
});
