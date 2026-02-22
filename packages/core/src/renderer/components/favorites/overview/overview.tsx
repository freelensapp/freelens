/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { FavoriteItem } from "../../../../features/favorites/common/storage.injectable";
import { Checkbox } from "../../checkbox";
import { TabLayout } from "../../layout/tab-layout";
import OrderableList from "../../orderable-list/orderable-list";
import favoritesSidebarItemsComputedInjectable, { FavoriteSidebarItem } from "../sidebar-items-computed.injectable";
import favoritesStoreInjectable, { FavoritesStore } from "../store.injectable";
import styles from "./overview.module.scss";

import type { IComputedValue } from "mobx";

interface Dependencies {
  favoritesStore: FavoritesStore;
  favoritesSidebarItems: IComputedValue<FavoriteSidebarItem[]>;
}

const NonInjectedFavoritesOverview = observer(({ favoritesStore, favoritesSidebarItems }: Dependencies) => {
  const favorites = favoritesStore.items;
  const hasFavorites = favorites.length > 0;

  const handleRemove = (itemId: string) => {
    favoritesStore.remove(itemId);
  };

  const renderItem = (item: FavoriteItem) => {
    const computedItem = favoritesSidebarItems.get().find((i) => i.id.replace("favorite-", "") === item.id);
    const isAvailable = !!computedItem;

    const handleCardClick = () => {
      if (isAvailable && computedItem) {
        computedItem.onClick();
      }
    };

    return (
      <div
        key={item.id}
        className={cssNames(styles.favoriteCard, { [styles.unavailable]: !isAvailable })}
        onClick={handleCardClick}
      >
        <div className={styles.dragHandle}>
          <Icon material="drag_indicator" />
        </div>
        <div className={styles.content}>
          <div className={styles.title}>{item.title}</div>
        </div>
        {!isAvailable && <div className={styles.unavailableText}>Not available in this cluster</div>}
        <button
          className={styles.removeButton}
          onClick={(e) => {
            e.stopPropagation();
            handleRemove(item.id);
          }}
          title="Remove from favorites"
        >
          <Icon material="close" />
        </button>
      </div>
    );
  };

  return (
    <TabLayout scrollable>
      <div className={styles.FavoritesOverview} data-testid="page-for-favorites-overview">
        <div className={styles.favoritesContainer}>
          <div className={styles.header}>
            <h5>Favorites</h5>
          </div>

          {!hasFavorites ? (
            <div className={styles.emptyState}>
              <h6>No favorites yet</h6>
              <p>Hover over any sidebar item and click the pin icon to add it here.</p>
            </div>
          ) : (
            <>
              <div className={styles.controlsRow}>
                <div className={styles.countLabel}>
                  {favorites.length} {favorites.length === 1 ? "item" : "items"}
                </div>
                <Checkbox
                  label="Use short names"
                  value={favoritesStore.useShortNames}
                  onChange={(value) => favoritesStore.setUseShortNames(value)}
                />
              </div>
              <OrderableList
                className={styles.favoritesList}
                onReorder={(start, end) => favoritesStore.reorder(start, end)}
              >
                {favorites.map((item) => renderItem(item))}
              </OrderableList>
            </>
          )}
        </div>
      </div>
    </TabLayout>
  );
});

export const FavoritesOverview = withInjectables<Dependencies>(NonInjectedFavoritesOverview, {
  getProps: (di, props) => ({
    ...props,
    favoritesSidebarItems: di.inject(favoritesSidebarItemsComputedInjectable),
    favoritesStore: di.inject(favoritesStoreInjectable),
  }),
});
