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

import type { FavoriteItem } from "../../../features/favorites/common/storage.injectable";

export type FavoriteSidebarItem = SidebarItemDeclaration & {
  orderNumber: number;
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

      const flattenSidebarItems = (items: any[]): any[] => {
        return items.reduce((acc, item) => {
          if (isFavoriteClone(item)) {
            return acc;
          }

          acc.push(item);

          if (item.children && item.children.length > 0) {
            acc.push(...flattenSidebarItems(item.children));
          }

          return acc;
        }, [] as any[]);
      };

      const flatSidebarItems = flattenSidebarItems(allSidebarItems);

      const itemMap = new Map(flatSidebarItems.map((item) => [item.id, item]));

      const favoritesMainItem = allSidebarItems.find((item) => item.id === favoritesSidebarItemInjectable.id);
      const naturalChildren = favoritesMainItem?.children || [];

      const dynamicFavorites = favoriteItems
        .map((fav: FavoriteItem) => {
          const originalItem = itemMap.get(fav.id);

          if (!originalItem) {
            return null;
          }

          return {
            id: `favorite-${fav.id}`,
            parentId: favoritesSidebarItemInjectable.id,
            title: originalItem.title,
            onClick: originalItem.onClick,
            isActive: originalItem.isActive,
            isVisible: originalItem.isVisible,
            getIcon: originalItem.getIcon,
            orderNumber: fav.order,
            children: originalItem.children,
          };
        })
        .filter((item: FavoriteSidebarItem | null): item is FavoriteSidebarItem => Boolean(item));

      return [...naturalChildren, ...dynamicFavorites];
    });
  },
});

export default favoritesSidebarItemsComputedInjectable;
