/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import storeMigrationVersionInjectable from "../../common/vars/store-migration-version.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import favoritesStateInjectable from "./common/state.injectable";
import favoritesPersistentStorageInjectable from "./common/storage.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IObservableValue } from "mobx";

import type { WriteJsonSync } from "../../common/fs/write-json-sync.injectable";
import type { PersistentStorage } from "../persistent-storage/common/create.injectable";
import type { FavoritesStorageState } from "./common/storage.injectable";

describe("Favorites storage technical tests", () => {
  let di: DiContainer;
  let favoritesPersistentStorage: PersistentStorage;
  let favoritesState: IObservableValue<FavoritesStorageState>;
  let writeJsonSync: WriteJsonSync;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    writeJsonSync = di.inject(writeJsonSyncInjectable);
  });

  describe("given no previous data in store, running all migrations", () => {
    beforeEach(() => {
      di.override(storeMigrationVersionInjectable, () => "9999.0.0");
      favoritesPersistentStorage = di.inject(favoritesPersistentStorageInjectable);
      favoritesState = di.inject(favoritesStateInjectable);
      favoritesPersistentStorage.loadAndStartSyncing();
    });

    it("loads empty favorites by default", () => {
      expect(favoritesState.get().items.length).toEqual(0);
    });

    it("defaults useShortNames to true", () => {
      expect(favoritesState.get().useShortNames).toEqual(true);
    });

    describe("add static favorite", () => {
      beforeEach(() => {
        favoritesState.set({
          items: [
            {
              id: "sidebar-item-pods",
              type: "static",
              title: "Pods",
              order: 10,
            },
          ],
          useShortNames: true,
        });
      });

      it("adds a static favorite to store", () => {
        const items = favoritesState.get().items;

        expect(items.length).toEqual(1);
        expect(items[0].id).toEqual("sidebar-item-pods");
        expect(items[0].type).toEqual("static");
        expect(items[0].title).toEqual("Pods");
        expect(items[0].order).toEqual(10);
      });
    });

    describe("add CRD favorite", () => {
      beforeEach(() => {
        favoritesState.set({
          items: [
            {
              id: "sidebar-item-custom-resource-group-cert-manager.io/certificates",
              type: "crd",
              title: "Certificates",
              order: 20,
            },
          ],
          useShortNames: true,
        });
      });

      it("adds a CRD favorite to store", () => {
        const items = favoritesState.get().items;

        expect(items.length).toEqual(1);
        expect(items[0].id).toEqual("sidebar-item-custom-resource-group-cert-manager.io/certificates");
        expect(items[0].type).toEqual("crd");
        expect(items[0].title).toEqual("Certificates");
        expect(items[0].order).toEqual(20);
      });
    });

    describe("add multiple favorites", () => {
      beforeEach(() => {
        favoritesState.set({
          items: [
            {
              id: "sidebar-item-pods",
              type: "static",
              title: "Pods",
              order: 10,
            },
            {
              id: "sidebar-item-deployments",
              type: "static",
              title: "Deployments",
              order: 20,
            },
            {
              id: "sidebar-item-custom-resource-group-cert-manager.io/certificates",
              type: "crd",
              title: "Certificates",
              order: 30,
            },
          ],
          useShortNames: true,
        });
      });

      it("stores multiple favorites", () => {
        const items = favoritesState.get().items;

        expect(items.length).toEqual(3);
        expect(items[0].id).toEqual("sidebar-item-pods");
        expect(items[1].id).toEqual("sidebar-item-deployments");
        expect(items[2].id).toEqual("sidebar-item-custom-resource-group-cert-manager.io/certificates");
      });
    });

    describe("remove favorite", () => {
      beforeEach(() => {
        favoritesState.set({
          items: [
            {
              id: "sidebar-item-pods",
              type: "static",
              title: "Pods",
              order: 10,
            },
            {
              id: "sidebar-item-deployments",
              type: "static",
              title: "Deployments",
              order: 20,
            },
          ],
          useShortNames: true,
        });
      });

      it("removes a favorite from store", () => {
        favoritesState.set({
          ...favoritesState.get(),
          items: favoritesState.get().items.filter((item) => item.id !== "sidebar-item-pods"),
        });

        const items = favoritesState.get().items;

        expect(items.length).toEqual(1);
        expect(items[0].id).toEqual("sidebar-item-deployments");
      });
    });

    describe("order preservation", () => {
      beforeEach(() => {
        favoritesState.set({
          items: [
            {
              id: "sidebar-item-pods",
              type: "static",
              title: "Pods",
              order: 30,
            },
            {
              id: "sidebar-item-deployments",
              type: "static",
              title: "Deployments",
              order: 10,
            },
            {
              id: "sidebar-item-services",
              type: "static",
              title: "Services",
              order: 20,
            },
          ],
          useShortNames: true,
        });
      });

      it("preserves order values as stored", () => {
        const items = favoritesState.get().items;

        expect(items[0].order).toEqual(30);
        expect(items[1].order).toEqual(10);
        expect(items[2].order).toEqual(20);
      });
    });

    describe("useShortNames persistence", () => {
      it("persists useShortNames as false", () => {
        favoritesState.set({
          items: [],
          useShortNames: false,
        });

        expect(favoritesState.get().useShortNames).toEqual(false);
      });
    });
  });

  describe("config with existing favorites", () => {
    beforeEach(() => {
      writeJsonSync("/some-directory-for-user-data/freelens-favorites-store.json", {
        __internal__: {
          migrations: {
            version: "99.99.99",
          },
        },
        items: [
          {
            id: "sidebar-item-pods",
            type: "static",
            title: "Pods",
            order: 10,
          },
          {
            id: "sidebar-item-custom-resource-group-cert-manager.io/certificates",
            type: "crd",
            title: "Certificates",
            order: 20,
          },
        ],
        useShortNames: false,
      });

      di.override(storeMigrationVersionInjectable, () => "9999.0.0");
      favoritesPersistentStorage = di.inject(favoritesPersistentStorageInjectable);
      favoritesState = di.inject(favoritesStateInjectable);
      favoritesPersistentStorage.loadAndStartSyncing();
    });

    it("restores favorites from existing state", () => {
      const items = favoritesState.get().items;

      expect(items.length).toEqual(2);
      expect(items[0].id).toEqual("sidebar-item-pods");
      expect(items[0].type).toEqual("static");
      expect(items[0].title).toEqual("Pods");
      expect(items[1].id).toEqual("sidebar-item-custom-resource-group-cert-manager.io/certificates");
      expect(items[1].type).toEqual("crd");
      expect(items[1].title).toEqual("Certificates");
    });

    it("restores useShortNames from existing state", () => {
      expect(favoritesState.get().useShortNames).toEqual(false);
    });
  });
});
