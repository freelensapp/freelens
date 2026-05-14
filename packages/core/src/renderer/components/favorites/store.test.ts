/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { noop } from "lodash/fp";
import { computed, type IObservableValue, observable } from "mobx";
import { FavoritesStore } from "./store.injectable";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { FavoritesStorageState } from "../../../features/favorites/common/storage.injectable";

const makeSidebarItem = (overrides: Partial<SidebarItemDeclaration> & { id: string }): SidebarItemDeclaration => ({
  parentId: null,
  title: overrides.title ?? overrides.id,
  onClick: noop,
  isActive: computed(() => false),
  isVisible: computed(() => true),
  children: [],
  ...overrides,
});

describe("FavoritesStore", () => {
  let store: FavoritesStore;
  let state: IObservableValue<FavoritesStorageState>;
  let sidebarItems: IObservableValue<SidebarItemDeclaration[]>;

  const podsItem = makeSidebarItem({ id: "sidebar-item-pods", title: "Pods", parentId: "sidebar-item-workloads" });
  const deploymentsItem = makeSidebarItem({
    id: "sidebar-item-deployments",
    title: "Deployments",
    parentId: "sidebar-item-workloads",
  });
  const workloadsItem = makeSidebarItem({
    id: "sidebar-item-workloads",
    title: "Workloads",
    children: [podsItem, deploymentsItem],
  });

  beforeEach(() => {
    state = observable.box<FavoritesStorageState>({ items: [], useShortNames: true });
    sidebarItems = observable.box<SidebarItemDeclaration[]>([workloadsItem, podsItem, deploymentsItem]);
    store = new FavoritesStore(state, sidebarItems);
  });

  describe("add", () => {
    it("adds a favorite with generated title", () => {
      store.add(podsItem, "static");

      expect(store.items.length).toEqual(1);
      expect(store.items[0].id).toEqual("sidebar-item-pods");
      expect(store.items[0].type).toEqual("static");
      expect(store.items[0].title).toEqual("Workloads - Pods");
    });

    it("does not add duplicate", () => {
      store.add(podsItem, "static");
      store.add(podsItem, "static");

      expect(store.items.length).toEqual(1);
    });

    it("assigns incrementing order", () => {
      store.add(podsItem, "static");
      store.add(deploymentsItem, "static");

      expect(store.items[0].order).toEqual(20);
      expect(store.items[1].order).toEqual(30);
    });
  });

  describe("remove", () => {
    beforeEach(() => {
      store.add(podsItem, "static");
      store.add(deploymentsItem, "static");
    });

    it("removes by id", () => {
      store.remove("sidebar-item-pods");

      expect(store.items.length).toEqual(1);
      expect(store.items[0].id).toEqual("sidebar-item-deployments");
    });

    it("handles favorite- prefixed id", () => {
      store.remove("favorite-sidebar-item-pods");

      expect(store.items.length).toEqual(1);
      expect(store.items[0].id).toEqual("sidebar-item-deployments");
    });

    it("does nothing for non-existent id", () => {
      store.remove("sidebar-item-non-existent");

      expect(store.items.length).toEqual(2);
    });
  });

  describe("toggle", () => {
    it("adds when not present", () => {
      store.toggle(podsItem, "static");

      expect(store.has("sidebar-item-pods")).toBe(true);
    });

    it("removes when already present", () => {
      store.add(podsItem, "static");
      store.toggle(podsItem, "static");

      expect(store.has("sidebar-item-pods")).toBe(false);
    });
  });

  describe("reorder", () => {
    beforeEach(() => {
      store.add(podsItem, "static");
      store.add(deploymentsItem, "static");
    });

    it("moves item from first to second position", () => {
      store.reorder(0, 1);

      expect(store.items[0].id).toEqual("sidebar-item-deployments");
      expect(store.items[1].id).toEqual("sidebar-item-pods");
    });

    it("does nothing for same index", () => {
      const itemsBefore = store.items.map((i) => i.id);

      store.reorder(0, 0);

      expect(store.items.map((i) => i.id)).toEqual(itemsBefore);
    });

    it("does nothing for out-of-bounds index", () => {
      const itemsBefore = store.items.map((i) => i.id);

      store.reorder(0, 99);

      expect(store.items.map((i) => i.id)).toEqual(itemsBefore);
    });

    it("reassigns order values after reorder", () => {
      store.reorder(0, 1);

      expect(store.items[0].order).toBeLessThan(store.items[1].order);
    });
  });

  describe("useShortNames", () => {
    it("defaults to true", () => {
      expect(store.useShortNames).toBe(true);
    });

    it("can be toggled to false", () => {
      store.setUseShortNames(false);

      expect(store.useShortNames).toBe(false);
    });
  });

  describe("has", () => {
    beforeEach(() => {
      store.add(podsItem, "static");
    });

    it("returns true for existing favorite", () => {
      expect(store.has("sidebar-item-pods")).toBe(true);
    });

    it("returns true with favorite- prefix", () => {
      expect(store.has("favorite-sidebar-item-pods")).toBe(true);
    });

    it("returns false for non-existent", () => {
      expect(store.has("sidebar-item-services")).toBe(false);
    });
  });

  describe("items sorting", () => {
    it("returns items sorted by order", () => {
      state.set({
        items: [
          { id: "b", type: "static", title: "B", order: 30 },
          { id: "a", type: "static", title: "A", order: 10 },
          { id: "c", type: "static", title: "C", order: 20 },
        ],
        useShortNames: true,
      });

      expect(store.items.map((i) => i.id)).toEqual(["a", "c", "b"]);
    });
  });
});
