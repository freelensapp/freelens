/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterSidebarFeature, sidebarItemInjectionToken } from "@freelensapp/cluster-sidebar";
import { createContainer, type DiContainer, getInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { noop } from "lodash/fp";
import { computed, type IComputedValue } from "mobx";
import { SidebarMenuItem } from "../../../common/sidebar-menu-items-starting-order";
import favoritesStateInjectable from "../../../features/favorites/common/state.injectable";
import { getClusterPageMenuOrderInjectable } from "../../../features/user-preferences/common/cluster-page-menu-order.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import favoritesSidebarItemsComputedInjectable, { FavoriteSidebarItem } from "./sidebar-items-computed.injectable";
import favoritesStoreInjectable from "./store.injectable";

const testPodsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-pods",
  instantiate: () => ({
    parentId: null,
    title: "Pods",
    onClick: noop,
    orderNumber: 10,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const testDeploymentsSidebarItemInjectable = getInjectable({
  id: "sidebar-item-deployments",
  instantiate: () => ({
    parentId: null,
    title: "Deployments",
    onClick: noop,
    orderNumber: 20,
  }),
  injectionToken: sidebarItemInjectionToken,
});

const testCrdSidebarItemInjectable = getInjectable({
  id: "sidebar-item-custom-resource-group-cert-manager.io/certificates",
  instantiate: () => ({
    parentId: null,
    title: "Certificates",
    onClick: noop,
    orderNumber: 30,
    isVisible: computed(() => true),
  }),
  injectionToken: sidebarItemInjectionToken,
});

const testInvisibleCrdSidebarItemInjectable = getInjectable({
  id: "sidebar-item-custom-resource-group-example.io/examples",
  instantiate: () => ({
    parentId: null,
    title: "Examples",
    onClick: noop,
    orderNumber: 40,
    isVisible: computed(() => false),
  }),
  injectionToken: sidebarItemInjectionToken,
});

describe("favorites sidebar items computed", () => {
  let di: DiContainer;
  let favoritesSidebarItems: IComputedValue<FavoriteSidebarItem[]>;
  let favoritesState: any;

  beforeEach(() => {
    di = createContainer("test");

    registerMobX(di);
    clusterSidebarFeature.register(di);

    di.register(
      userPreferencesStateInjectable,
      getClusterPageMenuOrderInjectable,
      testPodsSidebarItemInjectable,
      testDeploymentsSidebarItemInjectable,
      testCrdSidebarItemInjectable,
      testInvisibleCrdSidebarItemInjectable,
      favoritesStateInjectable,
      favoritesStoreInjectable,
      favoritesSidebarItemsComputedInjectable,
    );

    favoritesState = di.inject(favoritesStateInjectable);
    favoritesSidebarItems = di.inject(favoritesSidebarItemsComputedInjectable);
  });

  describe("with empty favorites", () => {
    beforeEach(() => {
      favoritesState.set({ items: [] });
    });

    it("returns empty array", () => {
      expect(favoritesSidebarItems.get().length).toEqual(0);
    });
  });

  describe("with static favorite", () => {
    beforeEach(() => {
      favoritesState.set({
        items: [
          {
            id: "sidebar-item-pods",
            type: "static",
            order: 10,
          },
        ],
      });
    });

    it("maps favorite to sidebar item", () => {
      const items = favoritesSidebarItems.get();

      expect(items.length).toEqual(1);
      expect(items[0].id).toEqual("favorite-sidebar-item-pods");
      expect(items[0].parentId).toEqual(SidebarMenuItem.Favorites);
      expect(items[0].title).toEqual("Pods");
      expect(items[0].orderNumber).toEqual(10);
    });
  });

  describe("with multiple favorites", () => {
    beforeEach(() => {
      favoritesState.set({
        items: [
          {
            id: "sidebar-item-pods",
            type: "static",
            order: 30,
          },
          {
            id: "sidebar-item-deployments",
            type: "static",
            order: 10,
          },
        ],
      });
    });

    it("maps all favorites to sidebar items", () => {
      const items = favoritesSidebarItems.get();

      expect(items.length).toEqual(2);
      expect(items[0].id).toEqual("favorite-sidebar-item-pods");
      expect(items[1].id).toEqual("favorite-sidebar-item-deployments");
    });

    it("preserves order from favorites", () => {
      const items = favoritesSidebarItems.get();

      expect(items[0].orderNumber).toEqual(30);
      expect(items[1].orderNumber).toEqual(10);
    });
  });

  describe("with CRD favorite", () => {
    beforeEach(() => {
      favoritesState.set({
        items: [
          {
            id: "sidebar-item-custom-resource-group-cert-manager.io/certificates",
            type: "crd",
            order: 50,
          },
        ],
      });
    });

    it("maps CRD favorite to sidebar item", () => {
      const items = favoritesSidebarItems.get();

      expect(items.length).toEqual(1);
      expect(items[0].id).toEqual("favorite-sidebar-item-custom-resource-group-cert-manager.io/certificates");
      expect(items[0].title).toEqual("Certificates");
    });

    it("delegates isVisible to original item", () => {
      const items = favoritesSidebarItems.get();

      expect(items[0].isVisible.get()).toEqual(true);
    });
  });

  describe("with invisible CRD favorite", () => {
    beforeEach(() => {
      favoritesState.set({
        items: [
          {
            id: "sidebar-item-custom-resource-group-example.io/examples",
            type: "crd",
            order: 60,
          },
        ],
      });
    });

    it("maps favorite but respects original visibility", () => {
      const items = favoritesSidebarItems.get();

      expect(items.length).toEqual(1);
      expect(items[0].isVisible.get()).toEqual(false);
    });
  });

  describe("with missing sidebar item", () => {
    beforeEach(() => {
      favoritesState.set({
        items: [
          {
            id: "sidebar-item-pods",
            type: "static",
            order: 10,
          },
          {
            id: "sidebar-item-non-existent",
            type: "crd",
            order: 20,
          },
          {
            id: "sidebar-item-deployments",
            type: "static",
            order: 30,
          },
        ],
      });
    });

    it("filters out missing items without crashing", () => {
      const items = favoritesSidebarItems.get();

      expect(items.length).toEqual(2);
      expect(items[0].id).toEqual("favorite-sidebar-item-pods");
      expect(items[1].id).toEqual("favorite-sidebar-item-deployments");
    });
  });

  describe("with mixed static and CRD favorites", () => {
    beforeEach(() => {
      favoritesState.set({
        items: [
          {
            id: "sidebar-item-pods",
            type: "static",
            order: 10,
          },
          {
            id: "sidebar-item-custom-resource-group-cert-manager.io/certificates",
            type: "crd",
            order: 20,
          },
          {
            id: "sidebar-item-deployments",
            type: "static",
            order: 30,
          },
        ],
      });
    });

    it("maps all favorites correctly", () => {
      const items = favoritesSidebarItems.get();

      expect(items.length).toEqual(3);
      expect(items[0].id).toEqual("favorite-sidebar-item-pods");
      expect(items[1].id).toEqual("favorite-sidebar-item-custom-resource-group-cert-manager.io/certificates");
      expect(items[2].id).toEqual("favorite-sidebar-item-deployments");
    });

    it("all items have correct parent", () => {
      const items = favoritesSidebarItems.get();

      items.forEach((item) => {
        expect(item.parentId).toEqual(SidebarMenuItem.Favorites);
      });
    });
  });
});
