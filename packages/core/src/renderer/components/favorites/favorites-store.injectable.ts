/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, makeObservable } from "mobx";
import favoritesStateInjectable from "./favorites-state.injectable";

import type { FavoriteItem } from "./favorites-storage.injectable";

export class FavoritesStore {
  constructor(private state: any) {
    makeObservable(this);
  }

  @computed get items() {
    return this.state.get().items;
  }

  @computed get highestOrder() {
    return this.items.reduce((max: number, item: FavoriteItem) => Math.max(max, item.order ?? 0), 0);
  }

  has(id: string) {
    return this.items.some((item: FavoriteItem) => item.id === this.#removeFavoritePrefix(id));
  }

  #removeFavoritePrefix(id: string) {
    return id.replace("favorite-", "");
  }

  @action
  add(item: Omit<FavoriteItem, "order">) {
    if (this.has(this.#removeFavoritePrefix(item.id))) {
      return;
    }

    const newItem: FavoriteItem = {
      ...item,
      order: this.highestOrder + 10,
    };

    this.state.set({
      items: [...this.items, newItem],
    });
  }

  @action
  remove(id: string) {
    const index = this.items.findIndex((item: FavoriteItem) => item.id === this.#removeFavoritePrefix(id));

    if (index !== -1) {
      const newItems = this.items.slice();
      newItems.splice(index, 1);
      this.state.set({ items: newItems });
    }
  }

  @action
  toggle(item: Omit<FavoriteItem, "order">) {
    if (this.has(item.id)) {
      this.remove(item.id);
    } else {
      this.add(item);
    }
  }
}

const favoritesStoreInjectable = getInjectable({
  id: "favorites-store",
  instantiate: (di) => {
    const state = di.inject(favoritesStateInjectable);

    return new FavoritesStore(state);
  },
});

export default favoritesStoreInjectable;
