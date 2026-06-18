/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import hasCategoryForEntityInjectable from "../../../common/catalog/has-category-for-entity.injectable";
import catalogCatalogEntityInjectable from "../../../common/catalog-entities/general-catalog-entities/implementations/catalog-catalog-entity.injectable";
import writeJsonSyncInjectable from "../../../common/fs/write-json-sync.injectable";
import storeMigrationVersionInjectable from "../../../common/vars/store-migration-version.injectable";
import catalogEntityRegistryInjectable from "../../../main/catalog/entity-registry.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import activeHotbarInjectable from "./common/active.injectable";
import addHotbarInjectable from "./common/add.injectable";
import hotbarsInjectable from "./common/hotbars.injectable";
import hotbarsPersistentStorageInjectable from "./common/storage.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

import type { CatalogEntity, CatalogEntityData, CatalogEntityKindData } from "../../../common/catalog";
import type { WriteJsonSync } from "../../../common/fs/write-json-sync.injectable";
import type { AddHotbar } from "./common/add.injectable";
import type { Hotbar } from "./common/hotbar";

function getMockCatalogEntity(data: Partial<CatalogEntityData> & CatalogEntityKindData): CatalogEntity {
  return {
    getName: jest.fn(() => data.metadata?.name),
    getId: jest.fn(() => data.metadata?.uid),
    getSource: jest.fn(() => data.metadata?.source ?? "unknown"),
    isEnabled: jest.fn(() => data.status?.enabled ?? true),
    onContextMenuOpen: jest.fn(),
    onSettingsOpen: jest.fn(),
    metadata: {},
    spec: {},
    status: {},
    ...data,
  } as CatalogEntity;
}

describe("Hotbars technical tests", () => {
  let di: DiContainer;
  let testCluster: CatalogEntity;
  let kindCluster: CatalogEntity;
  let awsCluster: CatalogEntity;
  let writeJsonSync: WriteJsonSync;
  let hotbars: IComputedValue<Hotbar[]>;
  let activeHotbar: IComputedValue<Hotbar | undefined>;
  let addHotbar: AddHotbar;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    testCluster = getMockCatalogEntity({
      apiVersion: "v1",
      kind: "Cluster",
      status: {
        phase: "Running",
      },
      metadata: {
        uid: "some-test-id",
        name: "my-test-cluster",
        source: "local",
        labels: {},
      },
    });
    kindCluster = getMockCatalogEntity({
      apiVersion: "v1",
      kind: "Cluster",
      status: {
        phase: "Running",
      },
      metadata: {
        uid: "some-kind-id",
        name: "my-kind-cluster",
        source: "local",
        labels: {},
      },
    });
    awsCluster = getMockCatalogEntity({
      apiVersion: "v1",
      kind: "Cluster",
      status: {
        phase: "Running",
      },
      metadata: {
        uid: "some-aws-id",
        name: "my-aws-cluster",
        source: "local",
        labels: {},
      },
    });

    di.override(hasCategoryForEntityInjectable, () => () => true);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    writeJsonSync = di.inject(writeJsonSyncInjectable);

    const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);
    const catalogCatalogEntity = di.inject(catalogCatalogEntityInjectable);

    catalogEntityRegistry.addComputedSource(
      "some-id",
      computed(() => [testCluster, kindCluster, awsCluster, catalogCatalogEntity]),
    );

    hotbars = di.inject(hotbarsInjectable);
    activeHotbar = di.inject(activeHotbarInjectable);

    addHotbar = di.inject(addHotbarInjectable);
  });

  describe("given no previous data in store, running all migrations", () => {
    beforeEach(() => {
      di.override(storeMigrationVersionInjectable, () => "9999.0.0");
      di.inject(hotbarsPersistentStorageInjectable).loadAndStartSyncing();
    });

    describe("load", () => {
      it("loads one hotbar by default", () => {
        expect(hotbars.get().length).toEqual(1);
      });
    });

    describe("add", () => {
      it("adds a hotbar", () => {
        addHotbar({ name: "hottest" });
        expect(hotbars.get().length).toEqual(2);
      });

      it("adds an empty hotbar", () => {
        addHotbar({ name: "hottest" });

        expect(hotbars.get()[1].items).toHaveLength(0);
      });
    });

    describe("hotbar items", () => {
      it("initially contains only the default items", () => {
        expect(activeHotbar.get()?.items).toHaveLength(2);
      });

      it("initially adds welcome page entity as first item", () => {
        expect(activeHotbar.get()?.items[0]?.entity.name).toEqual("Welcome Page");
      });

      it("initially adds catalog entity as second item", () => {
        expect(activeHotbar.get()?.items[1]?.entity.name).toEqual("Catalog");
      });

      it("adds items", () => {
        activeHotbar.get()?.addEntity(testCluster);

        expect(activeHotbar.get()?.items).toHaveLength(3);
      });

      it("adds more than 12 items", () => {
        for (let index = 0; index < 13; index += 1) {
          activeHotbar.get()?.addEntity(
            getMockCatalogEntity({
              apiVersion: "v1",
              kind: "Cluster",
              metadata: {
                uid: `cluster-${index}`,
                name: `cluster-${index}`,
                labels: {},
              },
            }),
          );
        }

        expect(activeHotbar.get()?.items).toHaveLength(15);
      });

      it("removes items", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.removeEntity("some-test-id");
        activeHotbar.get()?.removeEntity("catalog-entity");
        activeHotbar.get()?.removeEntity("welcome-page-entity");
        expect(activeHotbar.get()?.items).toHaveLength(0);
      });

      it("does nothing if removing with invalid uid", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.removeEntity("invalid uid");
        expect(activeHotbar.get()?.items).toHaveLength(3);
      });

      it("moves items down", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(kindCluster);
        activeHotbar.get()?.addEntity(awsCluster);

        // aws -> catalog
        activeHotbar.get()?.restack(4, 0);

        const items = activeHotbar.get()?.items.map((item) => item.entity.uid);

        expect(items).toEqual(["some-aws-id", "welcome-page-entity", "catalog-entity", "some-test-id", "some-kind-id"]);
      });

      it("moves items up", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(kindCluster);
        activeHotbar.get()?.addEntity(awsCluster);

        // test -> aws
        activeHotbar.get()?.restack(2, 4);

        const items = activeHotbar.get()?.items.map((item) => item.entity.uid);

        expect(items).toEqual(["welcome-page-entity", "catalog-entity", "some-kind-id", "some-aws-id", "some-test-id"]);
      });

      it("throws an error if getId is invalid or returns not a string", () => {
        expect(() => activeHotbar.get()?.addEntity({} as any)).toThrowError(TypeError);
        expect(() => activeHotbar.get()?.addEntity({ getId: () => true } as any)).toThrowError(TypeError);
      });

      it("throws an error if getName is invalid or returns not a string", () => {
        expect(() => activeHotbar.get()?.addEntity({ getId: () => "" } as any)).toThrowError(TypeError);
        expect(() => activeHotbar.get()?.addEntity({ getId: () => "", getName: () => 4 } as any)).toThrowError(
          TypeError,
        );
      });

      it("does nothing when item is moved to the same position", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.restack(2, 2);

        expect(activeHotbar.get()?.items[2].entity.uid).toEqual("some-test-id");
      });

      it("appends new items", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(awsCluster);
        activeHotbar.get()?.addEntity(kindCluster);

        expect(activeHotbar.get()?.items.at(-1)?.entity.uid).toEqual("some-kind-id");
      });

      it("throws if invalid arguments provided", () => {
        activeHotbar.get()?.addEntity(testCluster);

        expect(() => activeHotbar.get()?.restack(-5, 0)).toThrow();
        expect(() => activeHotbar.get()?.restack(2, -1)).toThrow();
        expect(() => activeHotbar.get()?.restack(14, 1)).toThrow();
        expect(() => activeHotbar.get()?.restack(11, 112)).toThrow();
      });

      it("checks if entity already pinned to hotbar", () => {
        activeHotbar.get()?.addEntity(testCluster);

        expect(activeHotbar.get()?.hasEntity(testCluster.getId())).toBeTruthy();
        expect(activeHotbar.get()?.hasEntity(awsCluster.getId())).toBeFalsy();
      });
    });
  });

  describe("given legacy stored hotbar data", () => {
    beforeEach(() => {
      writeJsonSync("/some-directory-for-user-data/lens-hotbar-store.json", {
        __internal__: {
          migrations: {
            version: "99.99.99",
          },
        },
        activeHotbarId: "legacy-hotbar",
        hotbars: [
          {
            id: "legacy-hotbar",
            name: "Legacy",
            items: [
              null,
              ...Array.from({ length: 14 }, (_, index) => ({
                entity: {
                  uid: `stored-entity-${index}`,
                  name: `Stored entity ${index}`,
                },
              })),
              null,
            ],
          },
        ],
      });

      di.override(storeMigrationVersionInjectable, () => "9999.0.0");
      di.inject(hotbarsPersistentStorageInjectable).loadAndStartSyncing();
    });

    it("removes empty slots without truncating pinned items", () => {
      expect(activeHotbar.get()?.items).toHaveLength(14);
      expect(activeHotbar.get()?.items.map((item) => item.entity.uid)).toEqual(
        Array.from({ length: 14 }, (_, index) => `stored-entity-${index}`),
      );
    });
  });
});
