/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";

import { NonInjectedItemListLayoutContent } from "../content";

import type { ItemListLayoutContentProps } from "../content";
import type { ItemObject } from "@freelensapp/list-layout";
import type { StorageLayer } from "../../../utils/storage-helper";

const makeStorage = () => {
  let state: Record<string, any> = {};

  return {
    get: () => state,
    set: (value: any) => {
      state = value;
    },
    reset: () => {
      state = {};
    },
    merge: (value: Record<string, any>) => {
      state = { ...state, ...value };
    },
    isDefaultValue: () => false,
  } as unknown as StorageLayer<Record<string, any>>;
};

type StubStore = {
  pickOnlySelected: (items: ItemObject[]) => ItemObject[];
  isLoaded: boolean;
  failedLoading: boolean;
  getTotalCount: () => number;
  isSelected: (item: ItemObject) => boolean;
  toggleSelection: (item: ItemObject) => void;
  isSelectedAll: (items: ItemObject[]) => boolean;
  toggleSelectionAll: (enabledItems: ItemObject[]) => void;
  removeItems: (selectedItems: ItemObject[]) => Promise<void>;
  readonly selectedItems: ItemObject[];
};

const baseProps: ItemListLayoutContentProps<ItemObject, boolean> & {
  columnResizeStorage: StorageLayer<Record<string, any>>;
  activeTheme: any;
  pageFiltersStore: any;
  openConfirmDialog: any;
  toggleTableColumnVisibility: any;
  isTableColumnHidden: any;
  store: StubStore;
} = {
  getFilters: () => [],
  tableId: "table-1",
  className: "",
  getItems: () => [],
  store: {
    pickOnlySelected: (items) => items,
    isLoaded: true,
    failedLoading: false,
    getTotalCount: () => 0,
    isSelected: () => false,
    toggleSelection: () => {},
    isSelectedAll: () => false,
    toggleSelectionAll: () => {},
    removeItems: async () => {},
    selectedItems: [],
  },
  getIsReady: () => true,
  renderTableContents: () => [],
  renderTableHeader: [],
  columnResizeStorage: makeStorage(),
  activeTheme: { get: () => ({ type: "light" }) },
  pageFiltersStore: {},
  openConfirmDialog: jest.fn(),
  toggleTableColumnVisibility: jest.fn(),
  isTableColumnHidden: jest.fn(),
  copyClassNameFromHeadCells: false,
  isConfigurable: false,
};

describe("column resize persistence", () => {
  it("loads saved widths on construct", () => {
    const storage = makeStorage();

    storage.merge({
      "table-1": {
        colA: 1.23,
        colB: 2.34,
      },
    });

    const component = new NonInjectedItemListLayoutContent({
      ...baseProps,
      columnResizeStorage: storage,
    });

    expect((component as any).columnFlexGrow.get("colA")).toBe(1.23);
    expect((component as any).columnFlexGrow.get("colB")).toBe(2.34);
  });

  it("saves rounded widths on mouseup", () => {
    const storage = makeStorage();
    const component = new NonInjectedItemListLayoutContent({
      ...baseProps,
      columnResizeStorage: storage,
    });

    (component as any).resizeState = {
      columnId: "colA",
      startX: 0,
      tableWidth: 100,
      initialFlexGrowValues: new Map(),
      initialColumnRight: 0,
    };

    (component as any).columnFlexGrow.set("colA", 3.5362);
    (component as any).columnFlexGrow.set("colB", 0.81224);

    (component as any).handleResizeEnd();

    const saved = storage.get();

    expect(saved["table-1"].colA).toBe(3.54);
    expect(saved["table-1"].colB).toBe(0.81);
  });

  it("clears saved width on reset", () => {
    const storage = makeStorage();
    storage.merge({
      "table-1": {
        colA: 1.5,
      },
    });

    const component = new NonInjectedItemListLayoutContent({
      ...baseProps,
      columnResizeStorage: storage,
    });

    (component as any).columnFlexGrow.set("colA", 1.5);

    (component as any).handleResizeReset("colA");

    const saved = storage.get();

    expect(saved["table-1"].colA).toBeUndefined();
    expect((component as any).columnFlexGrow.has("colA")).toBe(false);
  });

  it("enforces min flex-grow of 0.3", () => {
    const component = new NonInjectedItemListLayoutContent(baseProps);

    (component as any).getVisibleHeaders = () => [{ id: "colA" }, { id: "colB" }];

    (component as any).resizeState = {
      columnId: "colA",
      startX: 100,
      tableWidth: 1000,
      initialFlexGrowValues: new Map([
        ["colA", 1],
        ["colB", 1],
      ]),
      initialColumnRight: 0,
    };

    (component as any).handleResizeMove({ clientX: -400 } as MouseEvent);

    expect((component as any).columnFlexGrow.get("colA")).toBe(0.3);
  });

  it("redistributes proportionally across other columns", () => {
    const component = new NonInjectedItemListLayoutContent(baseProps);

    (component as any).getVisibleHeaders = () => [{ id: "colA" }, { id: "colB" }, { id: "colC" }];

    (component as any).resizeState = {
      columnId: "colA",
      startX: 100,
      tableWidth: 1000,
      initialFlexGrowValues: new Map([
        ["colA", 1],
        ["colB", 2],
        ["colC", 3],
      ]),
      initialColumnRight: 0,
    };

    (component as any).handleResizeMove({ clientX: 100 + 166.6667 } as MouseEvent);

    const colA = (component as any).columnFlexGrow.get("colA");
    const colB = (component as any).columnFlexGrow.get("colB");
    const colC = (component as any).columnFlexGrow.get("colC");

    expect(colA).toBeCloseTo(2, 2);
    expect(colB).toBeCloseTo(1.6, 2);
    expect(colC).toBeCloseTo(2.4, 2);
    expect(colB / colC).toBeCloseTo(2 / 3, 2);
  });

  it("does not redistribute into non-resizable columns", () => {
    const component = new NonInjectedItemListLayoutContent(baseProps);

    // Simulate component filtering out non-resizable columns from visible headers
    (component as any).getVisibleHeaders = () => [{ id: "colA" }, { id: "colB" }];

    (component as any).resizeState = {
      columnId: "colA",
      startX: 100,
      tableWidth: 900,
      initialFlexGrowValues: new Map([
        ["colA", 1],
        ["logs", 5],
        ["colB", 1],
      ]),
      initialColumnRight: 0,
    };

    (component as any).handleResizeMove({ clientX: 100 + 90 } as MouseEvent);

    expect((component as any).columnFlexGrow.get("logs")).toBeUndefined();
    expect((component as any).columnFlexGrow.get("colA")).toBeCloseTo(1.7, 2);
    expect((component as any).columnFlexGrow.get("colB")).toBeCloseTo(0.3, 2);
  });
});
