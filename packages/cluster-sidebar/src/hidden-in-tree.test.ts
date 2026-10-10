/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createContainer, type DiContainer, getInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { noop } from "es-toolkit";
import { computed, type IObservableValue, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { clusterSidebarFeature } from "./feature";
import sidebarItemsInjectable from "./sidebar-items.injectable";
import { isShownInSidebarTree, type SidebarItemDeclaration, sidebarItemInjectionToken } from "./tokens";

const parentSidebarItemInjectable = getInjectable({
  id: "sidebar-item-parent",
  instantiate: () => ({
    parentId: null,
    title: "Parent",
    onClick: noop,
    orderNumber: 10,
  }),
  injectionToken: sidebarItemInjectionToken,
});

describe("sidebar items hidden in the tree", () => {
  let di: DiContainer;
  let firstIsHidden: IObservableValue<boolean>;
  let secondIsHidden: IObservableValue<boolean>;
  let secondIsVisible: IObservableValue<boolean>;

  const getItem = (id: string): SidebarItemDeclaration => {
    const items = di.inject(sidebarItemsInjectable).get();
    const parent = items.find((item) => item.id === parentSidebarItemInjectable.id);
    const found = id === parentSidebarItemInjectable.id ? parent : parent?.children.find((child) => child.id === id);

    if (!found) {
      throw new Error(`no sidebar item "${id}"`);
    }

    return found;
  };

  beforeEach(() => {
    di = createContainer("test");
    firstIsHidden = observable.box(false);
    secondIsHidden = observable.box(false);
    secondIsVisible = observable.box(true);

    di.register(
      parentSidebarItemInjectable,
      getInjectable({
        id: "sidebar-item-first",
        instantiate: () => ({
          parentId: parentSidebarItemInjectable.id,
          title: "First",
          onClick: noop,
          orderNumber: 10,
          isHiddenInTree: computed(() => firstIsHidden.get()),
        }),
        injectionToken: sidebarItemInjectionToken,
      }),
      getInjectable({
        id: "sidebar-item-second",
        instantiate: () => ({
          parentId: parentSidebarItemInjectable.id,
          title: "Second",
          onClick: noop,
          orderNumber: 20,
          isVisible: computed(() => secondIsVisible.get()),
          isHiddenInTree: computed(() => secondIsHidden.get()),
        }),
        injectionToken: sidebarItemInjectionToken,
      }),
    );

    clusterSidebarFeature.register(di);
    registerMobX(di);
  });

  it("an item with no isHiddenInTree configuration is in the tree", () => {
    expect(getItem(parentSidebarItemInjectable.id).isHiddenInTree.get()).toBe(false);
    expect(isShownInSidebarTree(getItem("sidebar-item-first"))).toBe(true);
  });

  describe("when an item is hidden in the tree", () => {
    beforeEach(() => {
      runInAction(() => firstIsHidden.set(true));
    });

    it("is still visible", () => {
      expect(getItem("sidebar-item-first").isVisible.get()).toBe(true);
    });

    it("is not shown in the tree", () => {
      expect(isShownInSidebarTree(getItem("sidebar-item-first"))).toBe(false);
    });

    it("leaves its parent in the tree while a sibling is shown", () => {
      expect(isShownInSidebarTree(getItem(parentSidebarItemInjectable.id))).toBe(true);
    });

    it("takes its parent out of the tree when the only other child is hidden in it too", () => {
      runInAction(() => secondIsHidden.set(true));

      expect(isShownInSidebarTree(getItem(parentSidebarItemInjectable.id))).toBe(false);
      expect(getItem(parentSidebarItemInjectable.id).isVisible.get()).toBe(true);
    });

    it("takes its parent out of the tree when the only other child is not visible", () => {
      runInAction(() => secondIsVisible.set(false));

      expect(isShownInSidebarTree(getItem(parentSidebarItemInjectable.id))).toBe(false);
    });

    it("is back in the tree when no longer hidden", () => {
      runInAction(() => firstIsHidden.set(false));

      expect(isShownInSidebarTree(getItem("sidebar-item-first"))).toBe(true);
    });
  });
});
