/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createContainer, type DiContainer, getInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { noop } from "es-toolkit";
import { computed, type IComputedValue } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { clusterSidebarFeature } from "./feature";
import sidebarItemsInjectable from "./sidebar-items.injectable";
import { type SidebarItemDeclaration, sidebarItemInjectionToken } from "./tokens";

const someParentSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-parent",
  instantiate: () => ({
    parentId: null,
    title: "Some parent",
    onClick: noop,
    orderNumber: 42,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const someOtherParentSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-other-parent",
  instantiate: () => ({
    parentId: null,
    title: "Some other parent",
    onClick: noop,
    orderNumber: 126,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const someAnotherParentSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-another-parent",
  instantiate: () => ({
    parentId: null,
    title: "Some another parent",
    onClick: noop,
    orderNumber: 84,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const someForthParentSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-forth-parent",
  instantiate: () => ({
    parentId: null,
    title: "Some another parent",
    onClick: noop,
    orderNumber: 84,
    isVisible: computed(() => false),
    isActive: computed(() => true),
  }),
  injectionToken: sidebarItemInjectionToken,
});

const someChildSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-child",
  instantiate: () => ({
    parentId: someParentSidebarItemInjectable.id,
    title: "Some child",
    onClick: noop,
    orderNumber: 168,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const someOtherChildSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-other-child",
  instantiate: () => ({
    parentId: someParentSidebarItemInjectable.id,
    title: "Some other child",
    onClick: noop,
    orderNumber: 252,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const someAnotherChildSidebarItemInjectable = getInjectable({
  id: "sidebar-item-some-another-child",
  instantiate: () => ({
    parentId: someParentSidebarItemInjectable.id,
    title: "Some another child",
    onClick: noop,
    orderNumber: 210,
  }),
  injectionToken: sidebarItemInjectionToken,
});

describe("order of sidebar items", () => {
  let di: DiContainer;
  let sidebarItems: IComputedValue<SidebarItemDeclaration[]>;

  beforeEach(() => {
    di = createContainer("test");

    di.register(
      someParentSidebarItemInjectable,
      someOtherParentSidebarItemInjectable,
      someAnotherParentSidebarItemInjectable,
      someChildSidebarItemInjectable,
      someOtherChildSidebarItemInjectable,
      someAnotherChildSidebarItemInjectable,
      someForthParentSidebarItemInjectable,
    );

    clusterSidebarFeature.register(di);
    registerMobX(di);

    sidebarItems = di.inject(sidebarItemsInjectable);
  });

  it("has parent items in order", () => {
    const actual = sidebarItems.get().map((item) => item.id);

    expect(actual).toEqual([
      "sidebar-item-some-parent",
      "sidebar-item-some-another-parent",
      "sidebar-item-some-forth-parent",
      "sidebar-item-some-other-parent",
    ]);
  });

  it("an item with no children and no isVisible configuration by default is visible", () => {
    const item = sidebarItems.get().find((item) => item.id === someAnotherParentSidebarItemInjectable.id);

    expect(item?.isVisible.get()).toBe(true);
  });

  it("an item with no children and an isVisible configuration is whatever the configuration specifies", () => {
    const item = sidebarItems.get().find((item) => item.id === someForthParentSidebarItemInjectable.id);

    expect(item?.isVisible.get()).toBe(false);
  });

  it("an item with children is visible if at least one of the children is visible", () => {
    const item = sidebarItems.get().find((item) => item.id === "sidebar-item-some-parent");

    expect(item?.isVisible.get()).toBe(true);
  });

  it("an item with no children and no isActive configuration by default is not active", () => {
    const item = sidebarItems.get().find((item) => item.id === someAnotherParentSidebarItemInjectable.id);

    expect(item?.isActive.get()).toBe(false);
  });

  it("an item with no children and an isActive configuration is whatever the configuration specifies", () => {
    const item = sidebarItems.get().find((item) => item.id === someForthParentSidebarItemInjectable.id);

    expect(item?.isActive.get()).toBe(true);
  });

  it("an item with children is active if at least one of the children is active", () => {
    const item = sidebarItems.get().find((item) => item.id === "sidebar-item-some-parent");

    expect(item?.isActive.get()).toBe(false);
  });

  it("has child items in order", () => {
    const actual = sidebarItems
      .get()
      .find((item) => item.id === "sidebar-item-some-parent")
      ?.children.map((item) => item.id);

    expect(actual).toEqual([
      "sidebar-item-some-child",
      "sidebar-item-some-another-child",
      "sidebar-item-some-other-child",
    ]);
  });
});

describe("order of sidebar items that share an order key", () => {
  const getBlockItemInjectable = (id: string, orderKey: string, orderNumberInBlock?: number) =>
    getInjectable({
      id,
      instantiate: () => ({
        parentId: null,
        title: id,
        onClick: noop,
        orderNumber: 9999,
        orderKey,
        orderNumberInBlock,
      }),
      injectionToken: sidebarItemInjectionToken,
    });

  let sidebarItems: IComputedValue<SidebarItemDeclaration[]>;

  beforeEach(() => {
    const di = createContainer("test");

    di.register(
      getBlockItemInjectable("some-block-undeclared", "some-block"),
      getBlockItemInjectable("some-block-second", "some-block", 200),
      getBlockItemInjectable("some-other-block-only", "some-other-block", 50),
      getBlockItemInjectable("some-block-first", "some-block", 100),
      getBlockItemInjectable("some-block-tied-first", "some-block", 150),
      getBlockItemInjectable("some-block-tied-second", "some-block", 150),
      getInjectable({
        id: "some-host-item",
        instantiate: () => ({ parentId: null, title: "Some host item", onClick: noop, orderNumber: 10 }),
        injectionToken: sidebarItemInjectionToken,
      }),
    );

    clusterSidebarFeature.register(di);
    registerMobX(di);

    sidebarItems = di.inject(sidebarItemsInjectable);
  });

  it("orders the items of a block by their order number in the block, without interleaving another block placed at the same number", () => {
    expect(sidebarItems.get().map((item) => item.id)).toEqual([
      "some-host-item",
      "some-block-first",
      "some-block-tied-first",
      "some-block-tied-second",
      "some-block-second",
      "some-block-undeclared",
      "some-other-block-only",
    ]);
  });
});
