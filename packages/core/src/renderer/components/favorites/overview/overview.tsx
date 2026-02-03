/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./overview.scss";

import React from "react";
import { observer } from "mobx-react";

import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import favoritesStoreInjectable, { FavoritesStore } from "../store.injectable";
import favoritesSidebarItemsComputedInjectable, { FavoriteSidebarItem } from "../sidebar-items-computed.injectable";
import type { IComputedValue } from "mobx";
import { withInjectables } from "@ogre-tools/injectable-react";
import OrderableList from "../../orderable-list/orderable-list";
import { FavoriteItem } from "../../../../features/favorites/common/storage.injectable";

interface Dependencies {
  favoritesStore: FavoritesStore;
  favoritesSidebarItems: IComputedValue<FavoriteSidebarItem[]>;
}

const NonInjectedFavoritesOverview = observer(({ favoritesStore, favoritesSidebarItems }: Dependencies) => {
  const renderItem = (item: FavoriteItem) => {
    const computedItem = favoritesSidebarItems.get().find((i) => i.id.replace("favorite-", "") === item.id);

    if (!computedItem) {
      return (
        <div key={item.id}>
          <span>{item.title}</span>
          <span>Unavailable</span>
        </div>
      );
    }

    return (
      <div key={item.id}>
        <span>{computedItem.title}</span>
        <span>Available</span>
      </div>
    );
  };

  return (
    <SiblingsInTabLayout>
      <div className="FavoritesOverview">
        <div>
          <h5>Your Favorites</h5>
          <OrderableList className={``} onReorder={(start, end) => favoritesStore.reorder(start, end)}>
            {favoritesStore.items.map((item) => renderItem(item))}
          </OrderableList>
        </div>
      </div>
    </SiblingsInTabLayout>
  );
});

export const FavoritesOverview = withInjectables<Dependencies>(NonInjectedFavoritesOverview, {
  getProps: (di, props) => ({
    ...props,
    favoritesSidebarItems: di.inject(favoritesSidebarItemsComputedInjectable),
    favoritesStore: di.inject(favoritesStoreInjectable),
  }),
});
