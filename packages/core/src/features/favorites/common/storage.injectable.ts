/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, comparer } from "mobx";
import storeMigrationVersionInjectable from "../../../common/vars/store-migration-version.injectable";
import createPersistentStorageInjectable from "../../persistent-storage/common/create.injectable";
import persistentStorageMigrationsInjectable from "../../persistent-storage/common/migrations.injectable";
import { favoritesStoreMigrationInjectionToken } from "./migrations-token";
import favoritesStateInjectable from "./state.injectable";

export interface FavoriteItem {
  id: string;
  type: "static" | "crd";
  order: number;
}

export interface FavoritesStorageState {
  items: FavoriteItem[];
}

const favoritesPersistentStorageInjectable = getInjectable({
  id: "favorites-persistent-storage",

  instantiate: (di) => {
    const createPersistentStorage = di.inject(createPersistentStorageInjectable);
    const state = di.inject(favoritesStateInjectable);

    return createPersistentStorage<FavoritesStorageState>({
      configName: "freelens-favorites-store",
      accessPropertiesByDotNotation: false,
      projectVersion: di.inject(storeMigrationVersionInjectable),
      migrations: di.inject(persistentStorageMigrationsInjectable, favoritesStoreMigrationInjectionToken),
      syncOptions: {
        equals: comparer.structural,
      },
      fromStore: action((data) => {
        state.set({ items: data.items || [] });
      }),
      toJSON: () => ({
        items: state.get().items.map((item: FavoriteItem) => (item ? { ...item } : item)),
      }),
    });
  },
});

export default favoritesPersistentStorageInjectable;
