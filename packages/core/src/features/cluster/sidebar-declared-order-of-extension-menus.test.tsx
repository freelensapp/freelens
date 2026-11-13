/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import directoryForLensLocalStorageInjectable from "../../common/directory-for-lens-local-storage/directory-for-lens-local-storage.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import userPreferencesStateInjectable from "../user-preferences/common/state.injectable";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

const extensionKey = "sidebar-item-some-extension-name";

describe("cluster - the declared order of the sidebar menus of an extension", () => {
  let applicationBuilder: ApplicationBuilder;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();
    applicationBuilder.setEnvironmentToClusterFrame();
    applicationBuilder.beforeWindowStart(({ windowDi }) => {
      windowDi.override(directoryForLensLocalStorageInjectable, () => "/some-directory-for-lens-local-storage");
    });
    applicationBuilder.extensions.enable({
      id: "some-extension-id",
      name: "some-extension-name",
      rendererOptions: {
        clusterPageMenus: [
          { id: "second", title: "Second", orderNumber: 200, components: { Icon: () => null } },
          { id: "first", title: "First", orderNumber: 100, components: { Icon: () => null } },
          { id: "undeclared", title: "Undeclared", components: { Icon: () => null } },
          { id: "second-child", parentId: "first", title: "Second child", orderNumber: 200, components: {} },
          { id: "first-child", parentId: "first", title: "First child", orderNumber: 100, components: {} },
        ],
      },
    });
  });

  const getSidebarItems = () => applicationBuilder.applicationWindow.only.di.inject(sidebarItemsInjectable).get();
  const getUserPreferences = () => applicationBuilder.applicationWindow.only.di.inject(userPreferencesStateInjectable);
  const idsOf = (items: SidebarItemDeclaration[]) => items.map((item) => item.id);
  const isOfExtension = (item: SidebarItemDeclaration) => item.id.startsWith(`${extensionKey}-`);

  describe("given a fresh profile, when rendered", () => {
    beforeEach(async () => {
      await applicationBuilder.render();
    });

    it("orders the top-level menus of the extension by their declared order numbers", () => {
      expect(idsOf(getSidebarItems().filter(isOfExtension))).toEqual([
        "sidebar-item-some-extension-name-first",
        "sidebar-item-some-extension-name-second",
        "sidebar-item-some-extension-name-undeclared",
      ]);
    });

    it("orders the children by their declared order numbers", () => {
      const parent = getSidebarItems().find((item) => item.id === "sidebar-item-some-extension-name-first");

      expect(idsOf(parent?.children ?? [])).toEqual([
        "sidebar-item-some-extension-name-first-child",
        "sidebar-item-some-extension-name-second-child",
      ]);
    });

    it("keeps the menus of the extension together after the items of the host", () => {
      const ids = idsOf(getSidebarItems());
      const firstOfExtension = ids.findIndex((id) => id.startsWith(`${extensionKey}-`));

      expect(ids.slice(firstOfExtension)).toEqual([
        "sidebar-item-some-extension-name-first",
        "sidebar-item-some-extension-name-second",
        "sidebar-item-some-extension-name-undeclared",
      ]);
    });

    it("saves only the key of the extension, with the default position of its block", () => {
      const savedKeysOfExtension = Object.entries(getUserPreferences().clusterPageMenuOrder ?? {}).filter(([key]) =>
        key.startsWith(extensionKey),
      );

      expect(savedKeysOfExtension).toEqual([[extensionKey, 9999]]);
    });

    describe("when the user places the block of the extension between items of the host", () => {
      beforeEach(() => {
        runInAction(() => {
          getUserPreferences().clusterPageMenuOrder![extensionKey] = 15;
        });
      });

      it("places the block there, keeping the declared order inside it", () => {
        const ids = idsOf(getSidebarItems());
        const overview = ids.indexOf("sidebar-item-cluster-overview");

        expect(ids.slice(overview, overview + 5)).toEqual([
          "sidebar-item-cluster-overview",
          "sidebar-item-some-extension-name-first",
          "sidebar-item-some-extension-name-second",
          "sidebar-item-some-extension-name-undeclared",
          "sidebar-item-nodes",
        ]);
      });
    });
  });

  describe("given a profile with a saved position of the block of the extension, when rendered", () => {
    beforeEach(async () => {
      applicationBuilder.beforeWindowStart(({ windowDi }) => {
        const directoryForUserData = applicationBuilder.mainDi.inject(directoryForUserDataInjectable);

        windowDi.inject(writeJsonSyncInjectable)(`${directoryForUserData}/lens-user-store.json`, {
          preferences: { clusterPageMenuOrder: { [extensionKey]: 15 } },
        });
      });

      await applicationBuilder.render();
    });

    it("places the block at the saved position, keeping the declared order inside it", () => {
      const ids = idsOf(getSidebarItems());
      const overview = ids.indexOf("sidebar-item-cluster-overview");

      expect(ids.slice(overview, overview + 5)).toEqual([
        "sidebar-item-cluster-overview",
        "sidebar-item-some-extension-name-first",
        "sidebar-item-some-extension-name-second",
        "sidebar-item-some-extension-name-undeclared",
        "sidebar-item-nodes",
      ]);
    });

    it("keeps the saved position", () => {
      expect(getUserPreferences().clusterPageMenuOrder?.[extensionKey]).toBe(15);
    });
  });
});
