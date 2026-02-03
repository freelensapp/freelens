/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed, IObservableValue, makeObservable } from "mobx";
import favoritesStateInjectable from "../../../features/favorites/common/state.injectable";

import type { FavoriteItem, FavoritesStorageState } from "../../../features/favorites/common/storage.injectable";
import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";
import favoritesSidebarItemInjectable from "./sidebar-item.injectable";
import { flattenSidebarItems } from "./utils";

export class FavoritesStore {
  constructor(
    private state: IObservableValue<FavoritesStorageState>,
    private sidebarItems: IObservableValue<SidebarItemDeclaration[]>,
  ) {
    makeObservable(this);
  }

  @computed get items(): FavoriteItem[] {
    return this.state
      .get()
      .items.slice()
      .sort((a: FavoriteItem, b: FavoriteItem) => a.order - b.order);
  }

  @computed get highestOrder(): number {
    return this.items.reduce((max: number, item: FavoriteItem) => Math.max(max, item.order ?? 0), 10);
  }

  @computed get useShortNames(): boolean {
    return this.state.get().useShortNames ?? true;
  }

  @action
  setUseShortNames(value: boolean): void {
    this.state.set({
      ...this.state.get(),
      useShortNames: value,
    });
  }

  has(id: string): boolean {
    return this.items.some((item: FavoriteItem) => item.id === this.#removeFavoritePrefix(id));
  }

  #removeFavoritePrefix(id: string): string {
    return id.replace("favorite-", "");
  }

  #buildFavoriteTitle(item: SidebarItemDeclaration): string {
    const allSidebarItems = this.sidebarItems.get();
    const flatItems = flattenSidebarItems(allSidebarItems);

    const parentId = item.parentId ?? favoritesSidebarItemInjectable.id;
    const parent = parentId ? flatItems.find((i) => i.id === parentId) : undefined;
    const grandparent = parent?.parentId ? flatItems.find((i) => i.id === parent.parentId) : undefined;
    // this because item.title is StrictReactNode
    const rawTitle = item.title;
    const childTitle = typeof rawTitle === "string" ? rawTitle : String(rawTitle ?? "");
    const prefix = grandparent?.title ?? parent?.title;
    const displayTitle = prefix ? `${String(prefix ?? "")} - ${childTitle}` : childTitle;
    return displayTitle ? displayTitle : item.id;
  }

  @action
  add(item: SidebarItemDeclaration, type: "static" | "crd"): void {
    if (this.has(this.#removeFavoritePrefix(item.id))) {
      return;
    }

    const title = this.#buildFavoriteTitle(item);

    const newItem: FavoriteItem = {
      id: item.id,
      type,
      title,
      order: this.highestOrder + 10,
    };

    this.state.set({
      ...this.state.get(),
      items: [...this.items, newItem],
    });
  }

  @action
  remove(id: string): void {
    const index = this.items.findIndex((item: FavoriteItem) => item.id === this.#removeFavoritePrefix(id));

    if (index !== -1) {
      const newItems = this.items.slice();
      newItems.splice(index, 1);
      this.state.set({
        ...this.state.get(),
        items: newItems,
      });
    }
  }

  @action
  toggle(item: SidebarItemDeclaration, type: "static" | "crd"): void {
    if (this.has(item.id)) {
      this.remove(item.id);
    } else {
      this.add(item, type);
    }
  }

  @action
  reorder(startIndex: number, releaseIndex: number): void {
    if (startIndex === releaseIndex) return;
    if (startIndex < 0) return;
    if (releaseIndex < 0) return;

    const reordered = this.items.slice();
    if (startIndex >= reordered.length || releaseIndex >= reordered.length) return;

    const [itemToMove] = reordered.splice(startIndex, 1);
    reordered.splice(releaseIndex, 0, itemToMove);

    const newOrderedFavorites = reordered.map((item, idx) => ({ ...item, order: (idx + 2) * 10 }));
    this.state.set({
      ...this.state.get(),
      items: newOrderedFavorites,
    });
  }
}

const favoritesStoreInjectable = getInjectable({
  id: "favorites-store",
  instantiate: (di) => {
    const state = di.inject(favoritesStateInjectable);
    const sidebarItems = di.inject(sidebarItemsInjectable);

    return new FavoritesStore(state, sidebarItems);
  },
});

export default favoritesStoreInjectable;
