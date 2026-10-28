/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { computed } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { anyObject } from "vitest-mock-extended";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import hasCategoryForEntityInjectable from "../../../common/catalog/has-category-for-entity.injectable";
import catalogCatalogEntityInjectable from "../../../common/catalog-entities/general-catalog-entities/implementations/catalog-catalog-entity.injectable";
import storeMigrationVersionInjectable from "../../../common/vars/store-migration-version.injectable";
import catalogEntityRegistryInjectable from "../../../main/catalog/entity-registry.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import activeHotbarInjectable from "./common/active.injectable";
import addHotbarInjectable from "./common/add.injectable";
import hotbarsInjectable from "./common/hotbars.injectable";
import setAsActiveHotbarInjectable from "./common/set-as-active.injectable";
import hotbarsPersistentStorageInjectable from "./common/storage.injectable";
import { defaultHotbarCells, isHotbarFolderItem } from "./common/types";

import type { Logger } from "@freelensapp/logger";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type { Mocked } from "vitest";

import type { CatalogEntity, CatalogEntityData, CatalogEntityKindData } from "../../../common/catalog";
import type { AddHotbar } from "./common/add.injectable";
import type { Hotbar } from "./common/hotbar";
import type { SetAsActiveHotbar } from "./common/set-as-active.injectable";
import type { HotbarCellItem } from "./common/types";

function getMockCatalogEntity(data: Partial<CatalogEntityData> & CatalogEntityKindData): CatalogEntity {
  return {
    getName: vi.fn(() => data.metadata?.name),
    getId: vi.fn(() => data.metadata?.uid),
    getSource: vi.fn(() => data.metadata?.source ?? "unknown"),
    isEnabled: vi.fn(() => data.status?.enabled ?? true),
    onContextMenuOpen: vi.fn(),
    onSettingsOpen: vi.fn(),
    metadata: {},
    spec: {},
    status: {},
    ...data,
  } as CatalogEntity;
}

const entityOf = (item: HotbarCellItem | null | undefined) => (isHotbarFolderItem(item) ? undefined : item?.entity);

describe("Hotbars technical tests", () => {
  let di: DiContainer;
  let testCluster: CatalogEntity;
  let kindCluster: CatalogEntity;
  let awsCluster: CatalogEntity;
  let loggerMock: Mocked<Logger>;
  let setAsActiveHotbar: SetAsActiveHotbar;
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

    loggerMock = {
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      silly: vi.fn(),
    };

    di.override(loggerInjectionToken, () => loggerMock);

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);
    const catalogCatalogEntity = di.inject(catalogCatalogEntityInjectable);

    catalogEntityRegistry.addComputedSource(
      "some-id",
      computed(() => [testCluster, kindCluster, awsCluster, catalogCatalogEntity]),
    );

    setAsActiveHotbar = di.inject(setAsActiveHotbarInjectable);
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
    });

    describe("hotbar items", () => {
      it("initially creates default number of empty cells", () => {
        expect(activeHotbar.get()?.items?.length).toEqual(defaultHotbarCells);
      });

      it("initially adds welcome page entity as first item", () => {
        expect(entityOf(activeHotbar.get()?.items[0])?.name).toEqual("Welcome Page");
      });

      it("initially adds catalog entity as second item", () => {
        expect(entityOf(activeHotbar.get()?.items[1])?.name).toEqual("Catalog");
      });

      it("adds items", () => {
        activeHotbar.get()?.addEntity(testCluster);
        const items = activeHotbar.get()?.items.filter(Boolean);

        expect(items?.length).toEqual(3);
      });

      it("removes items", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.removeEntity("some-test-id");
        activeHotbar.get()?.removeEntity("catalog-entity");
        activeHotbar.get()?.removeEntity("welcome-page-entity");
        const items = activeHotbar.get()?.items.filter(Boolean);

        expect(items).toStrictEqual([]);
      });

      it("does nothing if removing with invalid uid", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.removeEntity("invalid uid");
        const items = activeHotbar.get()?.items.filter(Boolean);

        expect(items?.length).toEqual(3);
      });

      it("moves item to empty cell", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(kindCluster);
        activeHotbar.get()?.addEntity(awsCluster);

        expect(activeHotbar.get()?.items[6]).toBeNull();

        activeHotbar.get()?.restack(2, 5);

        expect(activeHotbar.get()?.items[5]).toBeTruthy();
        expect(entityOf(activeHotbar.get()?.items[5])?.uid).toEqual("some-test-id");
      });

      it("moves items down", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(kindCluster);
        activeHotbar.get()?.addEntity(awsCluster);

        // aws -> catalog
        activeHotbar.get()?.restack(4, 0);

        const items = activeHotbar.get()?.items.map((item) => entityOf(item)?.uid || null);

        expect(items?.slice(0, 5)).toEqual([
          "some-aws-id",
          "welcome-page-entity",
          "catalog-entity",
          "some-test-id",
          "some-kind-id",
        ]);
      });

      it("moves items up", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(kindCluster);
        activeHotbar.get()?.addEntity(awsCluster);

        // test -> aws
        activeHotbar.get()?.restack(2, 4);

        const items = activeHotbar.get()?.items.map((item) => entityOf(item)?.uid || null);

        expect(items?.slice(0, 5)).toEqual([
          "welcome-page-entity",
          "catalog-entity",
          "some-kind-id",
          "some-aws-id",
          "some-test-id",
        ]);
      });

      it("logs an error if cellIndex is out of bounds", () => {
        addHotbar({ name: "hottest", id: "hottest" });
        setAsActiveHotbar("hottest");

        activeHotbar.get()?.addEntity(testCluster, -1);
        expect(loggerMock.error).toBeCalledWith(
          "[HOTBAR]: cannot pin entity to hotbar outside of index range",
          anyObject(),
        );

        activeHotbar.get()?.addEntity(testCluster, 12);
        expect(loggerMock.error).toBeCalledWith(
          "[HOTBAR]: cannot pin entity to hotbar outside of index range",
          anyObject(),
        );

        activeHotbar.get()?.addEntity(testCluster, 13);
        expect(loggerMock.error).toBeCalledWith(
          "[HOTBAR]: cannot pin entity to hotbar outside of index range",
          anyObject(),
        );
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

      it("does nothing when item moved to same cell", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.restack(2, 2);

        expect(entityOf(activeHotbar.get()?.items[2])?.uid).toEqual("some-test-id");
      });

      it("new items takes first empty cell", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.addEntity(awsCluster);
        activeHotbar.get()?.restack(0, 4);
        activeHotbar.get()?.addEntity(kindCluster);

        expect(entityOf(activeHotbar.get()?.items[0])?.uid).toEqual("some-kind-id");
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

    describe("hotbar folders", () => {
      const folderOf = (index: number) => {
        const item = activeHotbar.get()?.items[index];

        return isHotbarFolderItem(item) ? item.folder : undefined;
      };

      it("adds a folder to the first empty cell", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A");

        expect(folderOf(2)).toEqual({ id: folderId, name: "Project A", items: [] });
      });

      it("adds a folder to the given cell", () => {
        activeHotbar.get()?.addFolder("Project A", 7);

        expect(folderOf(7)?.name).toEqual("Project A");
      });

      it("logs an error if the folder cell index is out of bounds", () => {
        expect(activeHotbar.get()?.addFolder("Project A", 12)).toBeUndefined();
        expect(loggerMock.error).toBeCalledWith(
          "[HOTBAR]: cannot pin entity to hotbar outside of index range",
          anyObject(),
        );
      });

      it("adds entities to a folder without using more cells", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);
        activeHotbar.get()?.addEntityToFolder(folderId, kindCluster);

        expect(folderOf(2)?.items.map((item) => item.entity.uid)).toEqual(["some-test-id", "some-kind-id"]);
        expect(activeHotbar.get()?.items.filter(Boolean).length).toEqual(3);
      });

      it("treats an entity in a folder as pinned", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);

        expect(activeHotbar.get()?.hasEntity(testCluster.getId())).toBeTruthy();
      });

      it("does not pin an entity to a cell when it is already in a folder", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);
        activeHotbar.get()?.addEntity(testCluster);

        expect(activeHotbar.get()?.items.filter(Boolean).length).toEqual(3);
      });

      it("moves an entity pinned to a cell into the folder", () => {
        activeHotbar.get()?.addEntity(testCluster);

        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);

        expect(entityOf(activeHotbar.get()?.items[2])).toBeUndefined();
        expect(folderOf(3)?.items.map((item) => item.entity.uid)).toEqual(["some-test-id"]);
      });

      it("moves an entity from one folder to another", () => {
        const folderA = activeHotbar.get()?.addFolder("Project A") as string;
        const folderB = activeHotbar.get()?.addFolder("Project B") as string;

        activeHotbar.get()?.addEntityToFolder(folderA, testCluster);
        activeHotbar.get()?.addEntityToFolder(folderB, testCluster);

        expect(folderOf(2)?.items).toEqual([]);
        expect(folderOf(3)?.items.map((item) => item.entity.uid)).toEqual(["some-test-id"]);
      });

      it("removes an entity from a folder", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);
        activeHotbar.get()?.removeEntity(testCluster.getId());

        expect(folderOf(2)?.items).toEqual([]);
        expect(activeHotbar.get()?.hasEntity(testCluster.getId())).toBeFalsy();
      });

      it("renames a folder", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.renameFolder(folderId, "Project B");

        expect(folderOf(2)?.name).toEqual("Project B");
      });

      it("sets a display name for an entity pinned to a cell", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.setDisplayName(testCluster.getId(), "  dev  ");

        expect(activeHotbar.get()?.getItem(testCluster.getId())?.displayName).toEqual("dev");
        expect(activeHotbar.get()?.getItem(testCluster.getId())?.entity.name).toEqual("my-test-cluster");
      });

      it("sets a display name for an entity in a folder", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);
        activeHotbar.get()?.setDisplayName(testCluster.getId(), "dev");

        expect(folderOf(2)?.items[0].displayName).toEqual("dev");
      });

      it("removes the display name when it is set to an empty name", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.setDisplayName(testCluster.getId(), "dev");
        activeHotbar.get()?.setDisplayName(testCluster.getId(), " ");

        expect(activeHotbar.get()?.getItem(testCluster.getId())).not.toHaveProperty("displayName");
      });

      it("keeps the display name when an entity is moved into a folder", () => {
        activeHotbar.get()?.addEntity(testCluster);
        activeHotbar.get()?.setDisplayName(testCluster.getId(), "dev");

        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);

        expect(folderOf(3)?.items[0].displayName).toEqual("dev");
      });

      it("ignores a display name for an entity that is not pinned", () => {
        activeHotbar.get()?.setDisplayName(testCluster.getId(), "dev");

        expect(activeHotbar.get()?.getItem(testCluster.getId())).toBeUndefined();
      });

      it("removes a folder and unpins its entities", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);
        activeHotbar.get()?.removeFolder(folderId);

        expect(activeHotbar.get()?.items[2]).toBeNull();
        expect(activeHotbar.get()?.hasEntity(testCluster.getId())).toBeFalsy();
      });

      it("moves a folder like any other cell", () => {
        activeHotbar.get()?.addFolder("Project A");
        activeHotbar.get()?.restack(2, 6);

        expect(folderOf(6)?.name).toEqual("Project A");
        expect(activeHotbar.get()?.items[2]).toBeNull();
      });

      it("serializes folders with their entities", () => {
        const folderId = activeHotbar.get()?.addFolder("Project A") as string;

        activeHotbar.get()?.addEntityToFolder(folderId, testCluster);

        expect(activeHotbar.get()?.toJSON().items[2]).toEqual({
          folder: {
            id: folderId,
            name: "Project A",
            items: [
              {
                entity: {
                  uid: "some-test-id",
                  name: "my-test-cluster",
                  source: "local",
                  shortName: expect.any(String),
                },
              },
            ],
          },
        });
      });
    });
  });
});
