/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { DiContextProvider } from "@ogre-tools/injectable-react";
import { act, fireEvent, render } from "@testing-library/react";
import { computed, getObserverTree, observable, reaction, runInAction } from "mobx";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { asyncComputed } from "../../../../common/utils/async-computed";
import { injectableDifferencingRegistratorWith } from "../../../../common/utils/registrator-helper";
import extensionInjectable from "../../../../extensions/extension-loader/extension/extension.injectable";
import catalogEntityRegistryInjectable from "../../../api/catalog/entity/registry.injectable";
import activeKubernetesClusterInjectable from "../../../cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import extensionShouldBeEnabledForClusterFrameInjectable from "../../../extension-loader/extension-should-be-enabled-for-cluster-frame.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../routes/currently-in-cluster-frame.injectable";
import lensLocalStorageStateInjectable from "../../../utils/create-storage/state.injectable";
import { getExtensionFakeForRenderer } from "../../test-utils/get-extension-fake";
import { Dock } from "../dock";
import dockStorageInjectable from "../dock/dock-storage.injectable";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import dockTabRegistratorInjectable from "./dock-tab-registrator.injectable";
import { copyDockTabParams, readExtensionDockTabData } from "./params";
import registeredDockTabsInjectable from "./registered-dock-tabs.injectable";
import { mockDocumentVisibility } from "./test-utils/mock-document-visibility";

import type { DiContainer, Injectable } from "@ogre-tools/injectable";

import type { CatalogEntity } from "../../../../common/catalog";
import type { KubernetesCluster } from "../../../../common/catalog-entities";
import type { Extension } from "../../../../extensions/extension-loader/extension/extension.injectable";
import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { DockTabParams, ExtensionDockTabProps } from "./dock-tab-registration";

describe("extension dock tabs", () => {
  let di: DiContainer;
  let extension: LensRendererExtension;
  let registrations: Injectable<any, any, any>[];
  let registrationDisposers: (() => void)[];
  let clusterStatus: { active: boolean };
  const enabled = observable.box(true);
  const cleanup = vi.fn();

  const registerDockTabs = (extension: LensRendererExtension) => {
    const registration = di.inject(dockTabRegistratorInjectable)(extension);

    if (Array.isArray(registration)) {
      runInAction(() => di.register(...registration));
      return registration;
    }

    registrationDisposers.push(
      reaction(() => registration.get(), injectableDifferencingRegistratorWith(di), { fireImmediately: true }),
    );

    return registration.get();
  };

  const Content = ({ tabId, params, close }: ExtensionDockTabProps) => {
    const [count, setCount] = useState(0);

    useEffect(() => () => cleanup(tabId), [tabId]);

    return (
      <div>
        <span>{String(params.pod)}</span>
        <button onClick={() => setCount(count + 1)}>Count {count}</button>
        <button onClick={close}>Close from extension</button>
      </div>
    );
  };

  beforeEach(async () => {
    registrationDisposers = [];
    enabled.set(true);
    cleanup.mockClear();
    di = getDiForUnitTesting();
    di.override(hostedClusterIdInjectable, () => "cluster-one");
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(directoryForUserDataInjectable, () => "/test-user-data");
    di.override(extensionShouldBeEnabledForClusterFrameInjectable, () =>
      asyncComputed({ getValueFromObservedPromise: async () => true, valueWhenPending: true }),
    );
    clusterStatus = observable({ active: true });
    vi.spyOn(di.inject(catalogEntityRegistryInjectable), "getById").mockReturnValue({
      status: clusterStatus,
    } as CatalogEntity);

    extension = getExtensionFakeForRenderer({
      id: "/installed/example/package.json",
      name: "@example/dock-tabs",
      rendererOptions: {
        dockTabs: [
          {
            id: "readable-logs",
            title: "Readable logs",
            enabled: computed(() => enabled.get()),
            components: { Tab: Content },
          },
        ],
      },
    });
    await extension.enable();
    registrations = registerDockTabs(extension);
    // No native terminal needs to spawn during these UI tests.
    di.inject(dockStoreInjectable).tabs = [];
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    registrationDisposers.forEach((dispose) => dispose());
  });

  const renderDock = () =>
    render(
      <DiContextProvider value={di}>
        <Dock />
      </DiContextProvider>,
    );

  it("opens selected instances through the public method and preserves stable owner and JSON parameters", () => {
    const params = { pod: "first", context: { namespace: "default" } };
    const first = extension.openDockTab("readable-logs", { title: "Pod first", params });
    const second = extension.openDockTab("readable-logs");
    const store = di.inject(dockStoreInjectable);

    params.context.namespace = "changed";

    expect(first).not.toBe(second);
    expect(store.selectedTabId).toBe(second);
    expect(store.isOpen).toBe(true);
    expect(store.getTabById(first)).toMatchObject({
      kind: TabKind.EXTENSION,
      pinned: false,
      title: "Pod first",
    });
    expect(readExtensionDockTabData(store.getTabById(first)?.extensionTab)).toEqual({
      version: 1,
      extensionName: "@example/dock-tabs",
      typeId: "readable-logs",
      params: { pod: "first", context: { namespace: "default" } },
    });
    expect(JSON.parse(JSON.stringify(di.inject(dockStorageInjectable).get())).tabs).toHaveLength(2);
  });

  it("rejects unknown types and disabled contributions", () => {
    expect(() => extension.openDockTab("unknown")).toThrow("not registered and enabled");
    enabled.set(false);
    expect(() => extension.openDockTab("readable-logs")).toThrow("not registered and enabled");
    expect(di.inject(dockStoreInjectable).tabs).toHaveLength(0);
  });

  it("rejects opening from the root frame", () => {
    const rootDi = getDiForUnitTesting();
    rootDi.override(currentlyInClusterFrameInjectable, () => false);
    rootDi.override(directoryForUserDataInjectable, () => "/test-user-data");
    const rootExtension = getExtensionFakeForRenderer({ id: "root", name: "root-extension" });

    expect(() => rootExtension.openDockTab("readable-logs")).toThrow("cluster frame");
  });

  it("rejects invalid parameters before creating a tab", () => {
    expect(() => extension.openDockTab("readable-logs", { params: { number: Infinity } })).toThrow("JSON");
    expect(di.inject(dockStoreInjectable).tabs).toHaveLength(0);
  });

  it("rejects invalid explicit and default titles before changing the dock", () => {
    const store = di.inject(dockStoreInjectable);
    const original = extension.openDockTab("readable-logs");
    const invalidTitle = { text: "not a string" } as unknown as string;

    expect(() => extension.openDockTab("readable-logs", { title: invalidTitle })).toThrow("title must be a string");
    extension.dockTabs[0].title = invalidTitle;
    expect(() => extension.openDockTab("readable-logs")).toThrow("title must be a string");
    expect(store.tabs.map(({ id }) => id)).toEqual([original]);
    expect(store.selectedTabId).toBe(original);
    expect(() => extension.openDockTab("readable-logs", { title: "Valid override" })).not.toThrow();
  });

  it("isolates types registered with the same ID by different extensions", async () => {
    const other = getExtensionFakeForRenderer({
      id: "other-extension",
      name: "@other/dock-tabs",
      rendererOptions: { dockTabs: [{ id: "readable-logs", title: "Other", components: { Tab: Content } }] },
    });
    await other.enable();
    registerDockTabs(other);

    const tabId = other.openDockTab("readable-logs");
    expect(
      readExtensionDockTabData(di.inject(dockStoreInjectable).getTabById(tabId)?.extensionTab)?.extensionName,
    ).toBe("@other/dock-tabs");
  });

  it("rejects duplicate and empty type IDs within an extension", () => {
    const registration = extension.dockTabs[0];
    extension.dockTabs = [registration, registration];
    expect(() => di.inject(dockTabRegistratorInjectable)(extension)).toThrow("unique");
    extension.dockTabs = [{ ...registration, id: " " }];
    expect(() => di.inject(dockTabRegistratorInjectable)(extension)).toThrow("nonempty");
  });

  it("renders native headers and mounts only selected content, with separate React state for each tab", () => {
    const first = extension.openDockTab("readable-logs", { params: { pod: "first" } });
    const second = extension.openDockTab("readable-logs", { params: { pod: "second" } });
    const store = di.inject(dockStoreInjectable);
    const view = renderDock();

    expect(view.getByTestId(`dock-tab-for-${first}`)).toBeInTheDocument();
    expect(view.getByTestId(`dock-tab-for-${second}`)).toBeInTheDocument();
    expect(view.queryByText("first")).not.toBeInTheDocument();
    expect(view.getByText("second")).toBeInTheDocument();
    fireEvent.click(view.getByText("Count 0"));
    expect(view.getByText("Count 1")).toBeInTheDocument();

    act(() => store.selectTab(first));

    expect(cleanup).toHaveBeenCalledWith(second);
    expect(view.getByText("first")).toBeInTheDocument();
    expect(view.getByText("Count 0")).toBeInTheDocument();
  });

  it("unmounts content when the dock collapses or the cluster goes inactive, then remounts when eligible", () => {
    const id = extension.openDockTab("readable-logs", { params: { pod: "first" } });
    const store = di.inject(dockStoreInjectable);
    const view = renderDock();

    act(() => store.close());
    expect(cleanup).toHaveBeenCalledWith(id);
    expect(view.queryByText("first")).not.toBeInTheDocument();
    act(() => store.open());
    expect(view.getByText("first")).toBeInTheDocument();

    act(() => {
      clusterStatus.active = false;
    });
    expect(view.queryByText("first")).not.toBeInTheDocument();
    act(() => {
      clusterStatus.active = true;
    });
    expect(view.getByText("first")).toBeInTheDocument();
  });

  it("does not mount content when the hosted cluster is unknown even if another cluster is active", () => {
    vi.spyOn(di.inject(catalogEntityRegistryInjectable), "getById").mockImplementation((id) =>
      id === "cluster-two" ? ({ status: { active: true } } as CatalogEntity) : undefined,
    );
    extension.openDockTab("readable-logs", { params: { pod: "first" } });
    const view = renderDock();

    expect(view.queryByText("first")).not.toBeInTheDocument();
    expect(di.inject(catalogEntityRegistryInjectable).getById).toHaveBeenCalledWith("cluster-one");
  });

  it("uses native titles and close buttons for enabled tabs and selects the remaining instance", () => {
    const first = extension.openDockTab("readable-logs", { params: { pod: "first" } });
    const second = extension.openDockTab("readable-logs", { title: "Pod second", params: { pod: "second" } });
    const view = renderDock();
    const store = di.inject(dockStoreInjectable);

    expect(view.getByTestId(`dock-tab-for-${first}`)).toHaveTextContent("Readable logs");
    expect(view.getByTestId(`dock-tab-for-${second}`)).toHaveTextContent("Pod second");
    fireEvent.click(view.getByTestId(`dock-tab-close-for-${second}`));
    expect(cleanup).toHaveBeenCalledWith(second);
    expect(store.selectedTabId).toBe(first);
    expect(view.getByText("first")).toBeInTheDocument();

    fireEvent.click(view.getByTestId(`dock-tab-close-for-${first}`));
    expect(cleanup).toHaveBeenCalledWith(first);
    expect(store.tabs).toHaveLength(0);
    expect(store.isOpen).toBe(false);
    expect(di.inject(dockStorageInjectable).get().tabs).toHaveLength(0);
  });

  it("unmounts content when disabled and keeps unavailable tabs closable", async () => {
    const id = extension.openDockTab("readable-logs", { params: { pod: "first" } });
    const view = renderDock();

    await act(async () => {
      await extension.disable();
    });

    expect(cleanup).toHaveBeenCalledWith(id);
    expect(view.getByText(/extension is unavailable or disabled/)).toBeInTheDocument();
    expect(() => extension.openDockTab("readable-logs")).toThrow("not registered and enabled");
    fireEvent.click(view.getByTestId(`dock-tab-close-for-${id}`));
    expect(di.inject(dockStoreInjectable).tabs).toHaveLength(0);
  });

  it("preserves selected tab state without cleanup when the document is hidden and shown", () => {
    const id = extension.openDockTab("readable-logs", { params: { pod: "first" } });
    const visibility = mockDocumentVisibility();

    try {
      const view = renderDock();
      fireEvent.click(view.getByRole("button", { name: "Count 0" }));

      visibility.setState("hidden");
      visibility.setState("visible");
      expect(view.getByRole("button", { name: "Count 1" })).toBeInTheDocument();
      expect(cleanup).not.toHaveBeenCalledWith(id);
    } finally {
      visibility.restore();
    }
  });

  it("recovers from a throwing extension when selecting another tab", () => {
    const ThrowingContent = () => {
      throw new Error("extension failure");
    };
    extension.dockTabs = [{ id: "broken", title: "Broken", components: { Tab: ThrowingContent } }];
    registerDockTabs(extension);
    const healthy = extension.openDockTab("readable-logs", { params: { pod: "healthy" } });
    extension.openDockTab("broken");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const view = renderDock();
      expect(view.getByText(/Error: extension failure/)).toBeInTheDocument();
      act(() => di.inject(dockStoreInjectable).selectTab(healthy));
      expect(view.getByText("healthy")).toBeInTheDocument();
    } finally {
      log.mockRestore();
    }
  });

  it("preserves descriptors while registrations load, disappear, and return", () => {
    const id = extension.openDockTab("readable-logs", { params: { pod: "restored" } });
    // A renderer restart restores JSON before extension registrations arrive.
    const stored = JSON.parse(JSON.stringify(di.inject(dockStorageInjectable).get()));
    di.inject(dockStorageInjectable).set(stored);
    runInAction(() => di.deregister(...registrations));
    const view = renderDock();

    expect(view.getByText(/extension is unavailable or disabled/)).toBeInTheDocument();
    expect(di.inject(dockStoreInjectable).getTabById(id)).toBeDefined();
    act(() => runInAction(() => di.register(...registrations)));
    expect(view.getByText("restored")).toBeInTheDocument();
    act(() => runInAction(() => di.deregister(...registrations)));
    expect(view.queryByText("restored")).not.toBeInTheDocument();
    expect(cleanup).toHaveBeenCalledWith(id);
  });

  it("closes from extension content and selects its neighbor", () => {
    const first = extension.openDockTab("readable-logs");
    const second = extension.openDockTab("readable-logs");
    const view = renderDock();

    fireEvent.click(view.getByText("Close from extension"));
    expect(cleanup).toHaveBeenCalledWith(second);
    expect(di.inject(dockStoreInjectable).selectedTabId).toBe(first);
  });

  it.each([
    ["missing descriptor", undefined],
    ["null descriptor", null],
    ["array descriptor", []],
    ["unknown version", { version: 2, extensionName: "@example/dock-tabs", typeId: "readable-logs", params: {} }],
    ["missing owner", { version: 1, typeId: "readable-logs", params: {} }],
    ["blank owner", { version: 1, extensionName: " ", typeId: "readable-logs", params: {} }],
    ["missing type", { version: 1, extensionName: "@example/dock-tabs", params: {} }],
    ["blank type", { version: 1, extensionName: "@example/dock-tabs", typeId: " ", params: {} }],
    ["null parameters", { version: 1, extensionName: "@example/dock-tabs", typeId: "readable-logs", params: null }],
    ["array parameters", { version: 1, extensionName: "@example/dock-tabs", typeId: "readable-logs", params: [] }],
  ])("restores a closable invalid-parameters view for %s", (_description, extensionTab) => {
    const id = "restored-extension-tab";
    di = getDiForUnitTesting();
    di.override(hostedClusterIdInjectable, () => "cluster-one");
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(directoryForUserDataInjectable, () => "/test-user-data");
    // Seed the real storage before the dock store is first constructed.
    di.inject(lensLocalStorageStateInjectable).dock = JSON.parse(
      JSON.stringify({
        height: 300,
        isOpen: true,
        selectedTabId: id,
        tabs: [{ id, kind: TabKind.EXTENSION, title: "Restored tab", pinned: false, extensionTab }],
      }),
    );
    const view = renderDock();

    expect(view.getByText(/saved parameters are invalid/)).toBeInTheDocument();
    expect(view.getByTestId(`dock-tab-for-${id}`)).toHaveTextContent("Restored tab");
    expect(di.inject(dockStoreInjectable).getTabById(id)).toBeDefined();
    fireEvent.click(view.getByTestId(`dock-tab-close-for-${id}`));
    expect(di.inject(dockStorageInjectable).get().tabs).toHaveLength(0);
  });
});

describe("dock tab JSON parameters", () => {
  it.each([
    undefined,
    () => {},
    BigInt(1),
    NaN,
    new Date(),
    new Map(),
    Symbol("value"),
    Array(1),
    { nested: undefined },
  ])("rejects values that cannot be restored unchanged: %p", (value) => {
    expect(() => copyDockTabParams({ value } as DockTabParams)).toThrow("JSON");
  });

  it("rejects cycles and permits repeated references without sharing mutable data", () => {
    const value: DockTabParams = {};
    value.self = value;
    expect(() => copyDockTabParams(value)).toThrow("cycles");

    const shared = { key: "value" };
    const copied = copyDockTabParams({ first: shared, second: shared, list: [null, true, 1] });
    expect(copied).toEqual({ first: shared, second: shared, list: [null, true, 1] });
    expect(copied.first).not.toBe(shared);
    expect(copied.first).not.toBe(copied.second);
  });
});

describe("extension dock tab registration through the extension loader", () => {
  let di: DiContainer;
  let extension: LensRendererExtension;
  let registration: Extension | undefined;
  let activeCluster: ReturnType<typeof observable.box<KubernetesCluster | null>>;

  const settleEligibility = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  beforeEach(async () => {
    registration = undefined;
    di = getDiForUnitTesting();
    di.override(hostedClusterIdInjectable, () => "cluster-one");
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(directoryForUserDataInjectable, () => "/test-user-data");
    activeCluster = observable.box({ getId: () => "cluster-one" } as KubernetesCluster);
    di.override(activeKubernetesClusterInjectable, () => computed(() => activeCluster.get()));
    extension = getExtensionFakeForRenderer({
      id: "/installed/dock-only/package.json",
      name: "@example/dock-only",
      rendererOptions: {
        dockTabs: [{ id: "example", title: "Example", components: { Tab: () => null } }],
      },
    });
    di.inject(dockStoreInjectable).tabs = [];
  });

  afterEach(() => {
    registration?.deregister();
  });

  it("allows the first command invocation after cluster eligibility resolves without another contribution prewarming it", async () => {
    let openedTabId: string | undefined;
    extension.commands = [
      {
        id: "open-example",
        title: "Open example",
        action: () => {
          openedTabId = extension.openDockTab("example");
        },
      },
    ];
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    await settleEligibility();

    expect(() => extension.commands[0].action({} as never)).not.toThrow();
    expect(di.inject(dockStoreInjectable).selectedTabId).toBe(openedTabId);
    expect(di.inject(dockStoreInjectable).tabs).toHaveLength(1);
  });

  it.each([true, false])(
    "rejects pending eligibility and respects the resolved cluster eligibility %p",
    async (allowed) => {
      let resolveEligibility!: (allowed: boolean) => void;
      const eligibility = new Promise<boolean>((resolve) => {
        resolveEligibility = resolve;
      });
      const checkEligibility = vi.spyOn(extension, "isEnabledForCluster").mockReturnValue(eligibility);
      registration = di.inject(extensionInjectable, extension);
      registration.register();
      await extension.enable();

      expect(checkEligibility).toHaveBeenCalledTimes(1);
      expect(() => extension.openDockTab("example")).toThrow("not registered and enabled");
      expect(di.inject(dockStoreInjectable).tabs).toHaveLength(0);

      await act(async () => resolveEligibility(allowed));
      await settleEligibility();

      if (allowed) {
        expect(() => extension.openDockTab("example")).not.toThrow();
        expect(di.inject(dockStoreInjectable).tabs).toHaveLength(1);
      } else {
        expect(() => extension.openDockTab("example")).toThrow("not registered and enabled");
        expect(di.inject(dockStoreInjectable).tabs).toHaveLength(0);
      }
    },
  );

  it("does not enable a contribution without an active Kubernetes cluster", async () => {
    activeCluster.set(null);
    const checkEligibility = vi.spyOn(extension, "isEnabledForCluster");
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    await settleEligibility();

    expect(checkEligibility).not.toHaveBeenCalled();
    expect(() => extension.openDockTab("example")).toThrow("not registered and enabled");
    expect(di.inject(dockStoreInjectable).tabs).toHaveLength(0);
  });

  it("does not register dock types or check eligibility in the root renderer", async () => {
    const rootDi = getDiForUnitTesting();
    rootDi.override(currentlyInClusterFrameInjectable, () => false);
    rootDi.override(activeKubernetesClusterInjectable, () => computed(() => activeCluster.get()));
    const checkEligibility = vi.spyOn(extension, "isEnabledForCluster");
    registration = rootDi.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    activeCluster.set({ getId: () => "root-selected-cluster" } as KubernetesCluster);
    await settleEligibility();

    expect(rootDi.inject(registeredDockTabsInjectable).get()).toHaveLength(0);
    expect(checkEligibility).not.toHaveBeenCalled();
    expect(() => extension.openDockTab("example")).toThrow("cluster frame");
  });

  it("settles a rejected eligibility check as unavailable without affecting another extension", async () => {
    const failure = new Error("cluster hook failed");
    const check = vi.spyOn(extension, "isEnabledForCluster").mockRejectedValue(failure);
    const log = vi.spyOn(di.inject(loggerInjectionToken), "error");
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    const eligibility = di.inject(extensionShouldBeEnabledForClusterFrameInjectable, extension);
    await settleEligibility();

    expect(check).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("cluster eligibility check failed"), failure);
    expect(eligibility.pending.get()).toBe(false);
    expect(eligibility.value.get()).toBe(false);
    expect(() => extension.openDockTab("example")).toThrow("not registered and enabled");

    const other = getExtensionFakeForRenderer({
      id: "/other/package.json",
      name: "@example/other-eligibility",
      rendererOptions: { dockTabs: extension.dockTabs },
    });
    const otherRegistration = di.inject(extensionInjectable, other);
    try {
      otherRegistration.register();
      await other.enable();
      await settleEligibility();
      expect(() => other.openDockTab("example")).not.toThrow();
    } finally {
      otherRegistration.deregister();
    }
  });

  it("releases cluster observation after each of twenty same-path reloads and after the last deregistration", async () => {
    const cluster = di.inject(activeKubernetesClusterInjectable);
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    const observerCount = () => getObserverTree(cluster).observers?.length ?? 0;
    const obsoleteChecks = [];

    for (let i = 0; i < 20; i++) {
      const reloaded = getExtensionFakeForRenderer({
        id: "/reload/package.json",
        name: "@example/reload",
        rendererOptions: { dockTabs: extension.dockTabs },
      });
      obsoleteChecks.push(vi.spyOn(reloaded, "isEnabledForCluster"));
      const reloadedRegistration = di.inject(extensionInjectable, reloaded);
      reloadedRegistration.register();
      reloadedRegistration.deregister();
    }

    expect(observerCount()).toBe(1);
    activeCluster.set({ getId: () => "cluster-two" } as KubernetesCluster);
    await settleEligibility();
    for (const check of obsoleteChecks) expect(check).toHaveBeenCalledTimes(1);

    registration.deregister();
    registration = undefined;
    expect(observerCount()).toBe(0);
  });

  it("gives direct, unobserved callers the asynchronously settled value", async () => {
    const check = vi.spyOn(extension, "isEnabledForCluster");
    const source = di.inject(activeKubernetesClusterInjectable);
    const eligibility = di.inject(extensionShouldBeEnabledForClusterFrameInjectable, extension);
    expect(eligibility.value.get()).toBe(false);
    expect(eligibility.pending.get()).toBe(true);
    await settleEligibility();
    expect(eligibility.value.get()).toBe(true);
    expect(eligibility.pending.get()).toBe(false);
    expect(check).toHaveBeenCalledTimes(1);
    expect(getObserverTree(source).observers ?? []).toHaveLength(0);
  });

  it("removes registrations and their eligibility observer, then restores the owner from a newly loaded extension", async () => {
    const checkEligibility = vi.spyOn(extension, "isEnabledForCluster");
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    await settleEligibility();
    const originalTabId = extension.openDockTab("example", { params: { restored: true } });
    const store = di.inject(dockStoreInjectable);

    registration.deregister();
    registration = undefined;
    await extension.disable();

    expect(di.inject(registeredDockTabsInjectable).get()).toHaveLength(0);
    expect(() => extension.openDockTab("example")).toThrow("not registered and enabled");
    expect(store.getTabById(originalTabId)).toBeDefined();
    activeCluster.set({ getId: () => "cluster-two" } as KubernetesCluster);
    await settleEligibility();
    expect(checkEligibility).toHaveBeenCalledTimes(1);

    extension = getExtensionFakeForRenderer({
      id: "/reinstalled/dock-only/package.json",
      name: "@example/dock-only",
      rendererOptions: { dockTabs: extension.dockTabs },
    });
    registration = di.inject(extensionInjectable, extension);
    registration.register();
    await extension.enable();
    await settleEligibility();

    expect(di.inject(registeredDockTabsInjectable).get()[0].enabled.get()).toBe(true);
    expect(readExtensionDockTabData(store.getTabById(originalTabId)?.extensionTab)).toMatchObject({
      extensionName: extension.name,
      typeId: "example",
      params: { restored: true },
    });
    expect(() => extension.openDockTab("example")).not.toThrow();
    expect(store.tabs).toHaveLength(2);
  });
});
