/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { computed } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../../common/fs/fs.injectable";
import extensionInjectable from "../../../../extensions/extension-loader/extension/extension.injectable";
import activeKubernetesClusterInjectable from "../../../cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../routes/currently-in-cluster-frame.injectable";
import initializeStateInjectable from "../../../utils/create-storage/initialize-state.injectable";
import storageSaveDelayInjectable from "../../../utils/create-storage/storage-save-delay.injectable";
import { getExtensionFakeForRenderer } from "../../test-utils/get-extension-fake";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import { readExtensionDockTabData, writeExtensionDockTabData } from "./params";
import registeredDockTabsInjectable from "./registered-dock-tabs.injectable";

import type { KubernetesCluster } from "../../../../common/catalog-entities";
import type { DockStorageState } from "../dock/store";
import type { DockTabParams } from "./dock-tab-registration";

describe("extension descriptors in native per-cluster dock persistence", () => {
  let userData: string;

  const getStoragePath = (clusterId: string) => path.join(userData, "lens-local-storage", `${clusterId}.json`);
  const readStorage = async (clusterId: string) =>
    JSON.parse(await readFile(getStoragePath(clusterId), "utf8")) as {
      dock: DockStorageState;
    };

  const startClusterRenderer = async (clusterId: string) => {
    const di = getDiForUnitTesting();
    di.override(hostedClusterIdInjectable, () => clusterId);
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(activeKubernetesClusterInjectable, () =>
      computed(() => ({ getId: () => clusterId }) as KubernetesCluster),
    );
    di.override(directoryForUserDataInjectable, () => userData);
    di.override(storageSaveDelayInjectable, () => 0);
    // Use the production JSON reader/writer and an OS temporary directory.
    di.unoverride(fsInjectable);
    di.permitSideEffects(fsInjectable);
    await di.inject(initializeStateInjectable).run();
    return di;
  };

  beforeEach(async () => {
    userData = await mkdtemp(path.join(tmpdir(), "freelens-dock-storage-"));
  });

  afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
  });

  it("writes separate cluster files, restores titles and JSON before registrations, and persists native close", async () => {
    const di = await startClusterRenderer("cluster-one");
    const first = di.inject(dockStoreInjectable);
    first.tabs = [];
    const params: DockTabParams = JSON.parse(
      '{"pod":"pod-one","namespace":"first","__proto__":{"value":1},"nested":{"list":[null,true,7,{"__proto__":"value"}]}}',
    );
    const firstDescriptor = {
      version: 1 as const,
      extensionName: "@example/storage",
      typeId: "resource",
      params,
    };
    const extension = getExtensionFakeForRenderer({
      id: "/installed/storage/package.json",
      name: firstDescriptor.extensionName,
      rendererOptions: {
        dockTabs: [{ id: firstDescriptor.typeId, title: "Resource", components: { Tab: () => null } }],
      },
    });
    const registration = di.inject(extensionInjectable, extension);
    registration.register();
    let firstId: string;
    try {
      await extension.enable();
      await vi.waitFor(() => expect(di.inject(registeredDockTabsInjectable).get()[0]?.enabled.get()).toBe(true));
      firstId = extension.openDockTab("resource", { title: "First cluster pod", params });
    } finally {
      registration.deregister();
    }
    first.height = 321;
    expect(readExtensionDockTabData(first.getTabById(firstId)?.extensionTab)).toEqual(firstDescriptor);
    await vi.waitFor(async () => {
      const disk = (await readStorage("cluster-one")).dock;
      expect(disk).toMatchObject({
        selectedTabId: firstId,
        height: 321,
        isOpen: true,
        tabs: [{ id: firstId, title: "First cluster pod" }],
      });
      expect(disk.tabs[0].extensionTab).toBe(JSON.stringify(firstDescriptor));
    });

    const second = (await startClusterRenderer("cluster-two")).inject(dockStoreInjectable);
    expect(second.tabs.every((tab) => tab.kind !== TabKind.EXTENSION)).toBe(true);
    second.tabs = [];
    const secondTab = second.createTab(
      {
        kind: TabKind.EXTENSION,
        title: "Second cluster pod",
        extensionTab: writeExtensionDockTabData({
          ...firstDescriptor,
          params: { pod: "pod-two", namespace: "second" },
        }),
      },
      false,
    );
    await vi.waitFor(async () => {
      const disk = (await readStorage("cluster-two")).dock;
      expect(disk.tabs).toMatchObject([{ id: secondTab.id, title: "Second cluster pod" }]);
      expect(readExtensionDockTabData(disk.tabs[0].extensionTab)?.params.pod).toBe("pod-two");
    });

    // A fresh DI container exercises startup hydration, before any extension is registered.
    const restarted = (await startClusterRenderer("cluster-one")).inject(dockStoreInjectable);
    expect(restarted.tabs).toHaveLength(1);
    expect(restarted.selectedTabId).toBe(firstId);
    expect(restarted.height).toBe(321);
    expect(restarted.getTabById(firstId)).toMatchObject({
      title: "First cluster pod",
      extensionTab: JSON.stringify(firstDescriptor),
    });
    expect(readExtensionDockTabData(restarted.getTabById(firstId)?.extensionTab)).toEqual(firstDescriptor);
    restarted.closeTab(firstId);
    await vi.waitFor(async () => {
      expect((await readStorage("cluster-one")).dock).toMatchObject({ tabs: [], isOpen: false });
    });
    expect((await readStorage("cluster-two")).dock.tabs[0].id).toBe(secondTab.id);
  });

  it.each([
    {
      version: 1,
      payload:
        '{"extensionName":"@example/legacy","typeId":"resource","params":{"__proto__":"own key","nested":{"__proto__":{"value":7}}}}',
    },
    { version: 2, payload: '{"__proto__":"own key","details":[{"__proto__":{"value":7}}]}' },
  ])("migrates legacy v$version without losing own keys", async ({ version, payload }) => {
    const clusterId = "legacy";
    const tabId = "legacy-tab";
    const legacy = { version, ...JSON.parse(payload) };
    await mkdir(path.dirname(getStoragePath(clusterId)), { recursive: true });
    await writeFile(
      getStoragePath(clusterId),
      JSON.stringify({
        dock: {
          height: 300,
          tabs: [{ id: tabId, kind: TabKind.EXTENSION, pinned: true, title: { invalid: true }, extensionTab: legacy }],
          selectedTabId: tabId,
          isOpen: true,
        },
      }),
    );

    const store = (await startClusterRenderer(clusterId)).inject(dockStoreInjectable);
    expect(store.selectedTab).toMatchObject({ title: "Extension tab", pinned: false });
    expect(readExtensionDockTabData(store.selectedTab?.extensionTab)).toEqual(version === 1 ? legacy : undefined);
    store.height = 330;
    await vi.waitFor(async () => {
      expect((await readStorage(clusterId)).dock.tabs).toMatchObject([
        { id: tabId, title: "Extension tab", pinned: false, extensionTab: JSON.stringify(legacy) },
      ]);
    });
    store.closeTab(tabId);
    await vi.waitFor(async () => expect((await readStorage(clusterId)).dock.tabs).toEqual([]));
  });

  it("keeps a legacy descriptor with numeric overflow selected, invalid, and closable after persistence", async () => {
    const clusterId = "overflow";
    const tabId = "overflow-tab";
    await mkdir(path.dirname(getStoragePath(clusterId)), { recursive: true });
    await writeFile(
      getStoragePath(clusterId),
      JSON.stringify({
        dock: {
          height: 300,
          tabs: [
            {
              id: tabId,
              kind: TabKind.EXTENSION,
              title: "Overflow tab",
              pinned: false,
              extensionTab: {
                version: 1,
                extensionName: "@example/legacy",
                typeId: "resource",
                params: { count: "overflow" },
              },
            },
          ],
          selectedTabId: tabId,
          isOpen: true,
        },
      }).replace('"overflow"', "1e400"),
    );

    const store = (await startClusterRenderer(clusterId)).inject(dockStoreInjectable);
    expect(store.selectedTab).toMatchObject({ id: tabId, title: "Overflow tab" });
    expect(readExtensionDockTabData(store.selectedTab?.extensionTab)).toBeUndefined();
    store.height = 330;
    await vi.waitFor(async () => expect((await readStorage(clusterId)).dock.height).toBe(330));

    const restarted = (await startClusterRenderer(clusterId)).inject(dockStoreInjectable);
    expect(restarted.selectedTab?.id).toBe(tabId);
    expect(readExtensionDockTabData(restarted.selectedTab?.extensionTab)).toBeUndefined();
    restarted.closeTab(tabId);
    await vi.waitFor(async () => expect((await readStorage(clusterId)).dock.tabs).toEqual([]));
  });
});
