/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { SidebarItemDeclaration, sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import favoritesSidebarItemInjectable from "./sidebar-item.injectable";
import favoritesStoreInjectable from "./store.injectable";
import { flattenSidebarItems } from "./utils";

import type { FavoriteItem } from "../../../features/favorites/common/storage.injectable";

export type FavoriteSidebarItem = SidebarItemDeclaration & {
  orderNumber?: number;
};

const favoritesSidebarItemsComputedInjectable = getInjectable({
  id: "favorites-sidebar-items-computed",

  instantiate: (di) => {
    const favoritesStore = di.inject(favoritesStoreInjectable);
    const sidebarItemsComputed = di.inject(sidebarItemsInjectable);

    return computed((): FavoriteSidebarItem[] => {
      const favoriteItems = favoritesStore.items;
      const allSidebarItems = sidebarItemsComputed.get();

      const isFavoriteClone = (item: any) => item.id?.startsWith("favorite-");

      const flatSidebarItems = flattenSidebarItems(allSidebarItems).filter((item) => !isFavoriteClone(item));

      const itemMap = new Map(flatSidebarItems.map((item) => [item.id, item]));

      const favoritesMainItem = allSidebarItems.find((item) => item.id === favoritesSidebarItemInjectable.id);
      const naturalChildren: FavoriteSidebarItem[] =
        favoritesMainItem?.children.map((item) => {
          const child = item as FavoriteSidebarItem;

          return { ...child, orderNumber: child.orderNumber ?? 10 };
        }) || [];

      const dynamicFavorites: FavoriteSidebarItem[] = favoriteItems
        .map((fav: FavoriteItem) => {
          const originalItem = itemMap.get(fav.id);

          if (!originalItem) {
            return null;
          }

          return {
            id: `favorite-${fav.id}`,
            parentId: originalItem.parentId,
            title: fav.title,
            onClick: originalItem.onClick,
            isActive: originalItem.isActive,
            isVisible: originalItem.isVisible,
            getIcon: originalItem.getIcon,
            orderNumber: fav.order,
            children: originalItem.children,
          } as FavoriteSidebarItem;
        })
        .filter((item): item is FavoriteSidebarItem => Boolean(item));

      return [...naturalChildren, ...dynamicFavorites];
    });
  },
});

export default favoritesSidebarItemsComputedInjectable;
