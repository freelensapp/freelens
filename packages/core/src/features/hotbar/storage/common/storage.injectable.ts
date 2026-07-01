/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { iter } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { action, comparer } from "mobx";
import catalogCatalogEntityInjectable from "../../../../common/catalog-entities/general-catalog-entities/implementations/catalog-catalog-entity.injectable";
import welcomeCatalogEntityInjectable from "../../../../common/catalog-entities/general-catalog-entities/implementations/welcome-catalog-entity.injectable";
import storeMigrationVersionInjectable from "../../../../common/vars/store-migration-version.injectable";
import createPersistentStorageInjectable from "../../../persistent-storage/common/create.injectable";
import persistentStorageMigrationsInjectable from "../../../persistent-storage/common/migrations.injectable";
import activeHotbarIdInjectable from "./active-id.injectable";
import createHotbarInjectable from "./create-hotbar.injectable";
import { hotbarStoreMigrationInjectionToken } from "./migrations-token";
import hotbarsStateInjectable from "./state.injectable";

import type { HotbarItem } from "./types";

interface StoredHotbarData {
  id: string;
  name: string;
  items: readonly (HotbarItem | null)[];
}

export interface HotbarStoreModel {
  hotbars: StoredHotbarData[];
  activeHotbarId: string | undefined;
}

const hotbarsPersistentStorageInjectable = getInjectable({
  id: "hotbars-persistent-storage",
  instantiate: (di) => {
    const state = di.inject(hotbarsStateInjectable);
    const createPersistentStorage = di.inject(createPersistentStorageInjectable);
    const catalogCatalogEntity = di.inject(catalogCatalogEntityInjectable);
    const welcomeCatalogEntity = di.inject(welcomeCatalogEntityInjectable);
    const activeHotbarId = di.inject(activeHotbarIdInjectable);
    const createHotbar = di.inject(createHotbarInjectable);

    return createPersistentStorage<HotbarStoreModel>({
      configName: "lens-hotbar-store",
      accessPropertiesByDotNotation: false, // To make dots safe in cluster context names
      syncOptions: {
        equals: comparer.structural,
      },
      projectVersion: di.inject(storeMigrationVersionInjectable),
      migrations: di.inject(persistentStorageMigrationsInjectable, hotbarStoreMigrationInjectionToken),
      fromStore: action((data) => {
        if (!data.hotbars || !data.hotbars.length) {
          const hotbar = createHotbar({
            name: "Default",
          });
          hotbar.items.push(
            {
              entity: {
                uid: welcomeCatalogEntity.metadata.uid,
                name: welcomeCatalogEntity.metadata.name,
                source: welcomeCatalogEntity.metadata.source,
              },
            },
            {
              entity: {
                uid: catalogCatalogEntity.metadata.uid,
                name: catalogCatalogEntity.metadata.name,
                source: catalogCatalogEntity.metadata.source,
              },
            },
          );
          state.replace([[hotbar.id, hotbar]]);
        } else {
          state.replace(data.hotbars.map((hotbar) => [hotbar.id, createHotbar(hotbar)]));
        }

        if (data.activeHotbarId) {
          activeHotbarId.set(data.activeHotbarId);
        }

        const firstHotbarId = iter.first(state.values())?.id;

        if (!activeHotbarId.get()) {
          activeHotbarId.set(firstHotbarId);
        } else if (!iter.find(state.values(), (hotbar) => hotbar.id === activeHotbarId.get())) {
          activeHotbarId.set(firstHotbarId);
        }
      }),
      toJSON: () => ({
        hotbars: iter
          .chain(state.values())
          .map((hotbar) => hotbar.toJSON())
          .toArray(),
        activeHotbarId: activeHotbarId.get(),
      }),
    });
  },
});

export default hotbarsPersistentStorageInjectable;
