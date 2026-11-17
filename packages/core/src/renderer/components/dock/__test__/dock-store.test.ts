/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";

import type { DockStore, DockTab } from "../dock/store";

const initialTabs: DockTab[] = [
  { id: "terminal", kind: TabKind.TERMINAL, title: "Terminal", pinned: false },
  { id: "create", kind: TabKind.CREATE_RESOURCE, title: "Create resource", pinned: false },
  { id: "edit", kind: TabKind.EDIT_RESOURCE, title: "Edit resource", pinned: false },
  { id: "install", kind: TabKind.INSTALL_CHART, title: "Install chart", pinned: false },
  { id: "logs", kind: TabKind.POD_LOGS, title: "Logs", pinned: false },
];

describe("DockStore", () => {
  let dockStore: DockStore;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(hostedClusterIdInjectable, () => "some-cluster-id");
    di.override(directoryForUserDataInjectable, () => "some-directory-for-user-data");

    dockStore = di.inject(dockStoreInjectable);
  });

  it("closes tab and selects one from right", () => {
    dockStore.tabs = initialTabs;
    dockStore.closeTab(dockStore.tabs[0].id);

    expect(dockStore.selectedTabId).toBe("create");

    dockStore.selectTab("edit");
    dockStore.closeTab("edit");

    expect(dockStore.selectedTabId).toBe("install");
  });

  it("closes last tab and selects one from right", () => {
    dockStore.tabs = initialTabs;
    dockStore.selectTab("logs");
    dockStore.closeTab("logs");

    expect(dockStore.selectedTabId).toBe("install");
  });

  it("closes tab and selects the last one", () => {
    dockStore.tabs = [
      { id: "terminal", kind: TabKind.TERMINAL, title: "Terminal", pinned: false },
      { id: "create", kind: TabKind.CREATE_RESOURCE, title: "Create resource", pinned: false },
    ];
    dockStore.closeTab("terminal");

    expect(dockStore.selectedTabId).toBe("create");
  });

  it("closes last tab and selects none", () => {
    dockStore.tabs = [{ id: "create", kind: TabKind.CREATE_RESOURCE, title: "Create resource", pinned: false }];
    dockStore.closeTab("create");

    expect(dockStore.selectedTabId).toBeUndefined();
  });

  it("doesn't change selected tab if other tab closed", () => {
    dockStore.tabs = initialTabs;
    dockStore.closeTab("install");

    expect(dockStore.selectedTabId).toBe("terminal");
  });

  it("closes the tabs to the left of a tab and keeps the selected one", () => {
    dockStore.tabs = initialTabs;
    dockStore.selectTab("install");
    dockStore.closeTabsToTheLeft("edit");

    expect(dockStore.tabs.map((tab) => tab.id)).toEqual(["edit", "install", "logs"]);
    expect(dockStore.selectedTabId).toBe("install");
  });

  it("closes the tabs to the left of a tab and selects a remaining one when the selected tab was closed", () => {
    dockStore.tabs = initialTabs;
    dockStore.selectTab("terminal");
    dockStore.closeTabsToTheLeft("install");

    expect(dockStore.tabs.map((tab) => tab.id)).toEqual(["install", "logs"]);
    expect(dockStore.selectedTabId).toBe("install");
  });

  it("keeps the pinned tabs when closing the tabs to the left", () => {
    dockStore.tabs = [{ ...initialTabs[0], pinned: true }, ...initialTabs.slice(1)];
    dockStore.closeTabsToTheLeft("install");

    expect(dockStore.tabs.map((tab) => tab.id)).toEqual(["terminal", "install", "logs"]);
  });

  it("closes nothing to the left of the first tab", () => {
    dockStore.tabs = initialTabs;
    dockStore.closeTabsToTheLeft("terminal");

    expect(dockStore.tabs.map((tab) => tab.id)).toEqual(["terminal", "create", "edit", "install", "logs"]);
  });
});
