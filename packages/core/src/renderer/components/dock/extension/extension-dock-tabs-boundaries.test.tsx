/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DiContextProvider } from "@ogre-tools/injectable-react";
import { act, fireEvent, render } from "@testing-library/react";
import { computed, observable } from "mobx";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import extensionInjectable from "../../../../extensions/extension-loader/extension/extension.injectable";
import catalogEntityRegistryInjectable from "../../../api/catalog/entity/registry.injectable";
import activeKubernetesClusterInjectable from "../../../cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../routes/currently-in-cluster-frame.injectable";
import lensLocalStorageStateInjectable from "../../../utils/create-storage/state.injectable";
import { getExtensionFakeForRenderer } from "../../test-utils/get-extension-fake";
import { Dock } from "../dock";
import dockStorageInjectable from "../dock/dock-storage.injectable";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import * as paramsCodec from "./params";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CatalogEntity } from "../../../../common/catalog";
import type { KubernetesCluster } from "../../../../common/catalog-entities";
import type { Extension } from "../../../../extensions/extension-loader/extension/extension.injectable";
import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { DockTabParams, DockTabRegistration, ExtensionDockTabProps } from "./dock-tab-registration";

describe("extension dock lifetime and ownership boundaries", () => {
  let di: DiContainer;
  let registrations: Extension[];
  let visible: { active: boolean };

  const register = async (extension: LensRendererExtension) => {
    const registration = di.inject(extensionInjectable, extension);
    registrations.push(registration);
    registration.register();
    await extension.enable();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return registration;
  };

  const makeExtension = (id: string, dockTabs: DockTabRegistration[]) =>
    getExtensionFakeForRenderer({ id, name: "@example/boundary", rendererOptions: { dockTabs } });

  const renderDock = () =>
    render(
      <DiContextProvider value={di}>
        <Dock />
      </DiContextProvider>,
    );

  const mockDocumentVisibility = (initiallyHidden: boolean) => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(initiallyHidden);

    return {
      setHidden(next: boolean) {
        hidden.mockReturnValue(next);
        fireEvent(document, new Event("visibilitychange"));
      },
      restore: () => hidden.mockRestore(),
    };
  };

  beforeEach(() => {
    registrations = [];
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/test-user-data");
    di.override(hostedClusterIdInjectable, () => "boundary-cluster");
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(activeKubernetesClusterInjectable, () =>
      computed(() => ({ getId: () => "boundary-cluster" }) as KubernetesCluster),
    );
    visible = observable({ active: true });
    vi.spyOn(di.inject(catalogEntityRegistryInjectable), "getById").mockReturnValue({
      status: visible,
    } as CatalogEntity);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    act(() => registrations.forEach((registration) => registration.deregister()));
    vi.useRealTimers();
  });

  it("recovers saved content with a new installation while rejecting the still-enabled stale owner", async () => {
    const OldContent = () => <span>Old installation</span>;
    const old = makeExtension("/old-install/package.json", [
      { id: "resource", title: "Resource", components: { Tab: OldContent } },
    ]);
    const oldRegistration = await register(old);
    const store = di.inject(dockStoreInjectable);
    store.tabs = [];
    const tabId = old.openDockTab("resource", { title: "Saved resource", params: { resource: "pod-a" } });
    const view = renderDock();
    expect(view.getByText("Old installation")).toBeInTheDocument();

    act(() => oldRegistration.deregister());
    registrations = [];
    // Deliberately retain the old enabled object, as a stale async callback could.
    expect(old.isEnabled).toBe(true);
    expect(view.getByText(/extension is unavailable or disabled/)).toBeInTheDocument();
    const replacement = makeExtension("/different-install/package.json", [
      {
        id: "resource",
        title: "Resource",
        components: { Tab: ({ params }) => <span>{String(params.resource)}</span> },
      },
    ]);
    await act(async () => {
      await register(replacement);
    });

    expect(view.getByText("pod-a")).toBeInTheDocument();
    expect(view.getByTestId(`dock-tab-for-${tabId}`)).toHaveTextContent("Saved resource");
    expect(() => old.openDockTab("resource")).toThrow("not registered and enabled");
    expect(store.tabs).toHaveLength(1);
    let newTabId: string;
    act(() => {
      newTabId = replacement.openDockTab("resource");
    });
    expect(paramsCodec.readExtensionDockTabData(store.getTabById(newTabId!)?.extensionTab)?.extensionName).toBe(
      "@example/boundary",
    );
  });

  it.each([true, false])(
    "checks the new instance's cluster eligibility when an extension is replaced at the same path (%s)",
    async (allowed) => {
      const dockTabs: DockTabRegistration[] = [{ id: "resource", title: "Resource", components: { Tab: () => null } }];
      const original = makeExtension("/same-install/package.json", dockTabs);
      vi.spyOn(original, "isEnabledForCluster").mockResolvedValue(!allowed);
      const originalRegistration = await register(original);
      originalRegistration.deregister();
      registrations = [];

      const replacement = makeExtension("/same-install/package.json", dockTabs);
      const checkReplacement = vi.spyOn(replacement, "isEnabledForCluster").mockResolvedValue(allowed);
      await register(replacement);

      const store = di.inject(dockStoreInjectable);
      store.tabs = [];
      if (allowed) {
        expect(() => replacement.openDockTab("resource")).not.toThrow();
        expect(store.tabs).toHaveLength(1);
      } else {
        expect(() => replacement.openDockTab("resource")).toThrow("not registered and enabled");
        expect(store.tabs).toHaveLength(0);
      }
      expect(checkReplacement).toHaveBeenCalledTimes(1);
    },
  );

  it.each([null, [], "text", 7])("rejects a non-object params value through the public opener: %j", async (params) => {
    const extension = makeExtension("/invalid-params/package.json", [
      { id: "resource", title: "Resource", components: { Tab: () => null } },
    ]);
    await register(extension);
    const store = di.inject(dockStoreInjectable);
    store.tabs = [];

    expect(() => extension.openDockTab("resource", { params: params as unknown as DockTabParams })).toThrow(
      "JSON object",
    );
    expect(store.tabs).toHaveLength(0);
  });

  it("keeps immutable props stable across native storage resizes and decodes only selected descriptors", async () => {
    const mounted = vi.fn();
    const cleaned = vi.fn();
    const Content = ({ params, close }: ExtensionDockTabProps) => {
      useEffect(() => {
        mounted(params, close);
        return () => cleaned();
      }, [params, close]);
      return <span>Visible content</span>;
    };
    const extension = makeExtension("/immutable/package.json", [
      { id: "resource", title: "Resource", components: { Tab: Content } },
    ]);
    await register(extension);
    const store = di.inject(dockStoreInjectable);
    store.tabs = [];
    const inactive = Array.from({ length: 24 }, () => extension.openDockTab("resource"));
    const builder = { nested: { list: [{ resource: "original" }] } };
    const selected = extension.openDockTab("resource", { params: builder });
    builder.nested.list[0].resource = "modified by caller";
    const readDescriptor = vi.spyOn(paramsCodec, "readExtensionDockTabData");

    try {
      const view = renderDock();
      expect(view.getByText("Visible content")).toBeInTheDocument();
      expect(readDescriptor).toHaveBeenCalledTimes(1);
      expect(mounted).toHaveBeenCalledTimes(1);
      const [params, close] = mounted.mock.calls[0];
      expect(Object.isFrozen(params)).toBe(true);
      expect(Object.isFrozen(params.nested)).toBe(true);
      expect(Object.isFrozen(params.nested.list)).toBe(true);
      expect(Reflect.set(params.nested.list[0], "resource", "modified by component")).toBe(false);

      const originalTabObject = store.getTabById(selected);
      for (let height = 310; height < 322; height++) {
        act(() => {
          store.height = height;
        });
      }
      expect(store.getTabById(selected)).not.toBe(originalTabObject);
      expect(readDescriptor).toHaveBeenCalledTimes(1);
      expect(mounted).toHaveBeenCalledTimes(1);
      expect(cleaned).not.toHaveBeenCalled();

      act(() => store.selectTab(inactive[0]));
      act(() => store.selectTab(selected));
      expect(mounted).toHaveBeenLastCalledWith({ nested: { list: [{ resource: "original" }] } }, close);
      expect(readDescriptor).toHaveBeenCalledTimes(3);
      expect(cleaned).toHaveBeenCalledTimes(2);
    } finally {
      readDescriptor.mockRestore();
    }
  });

  it("keeps a lazily resolved component type and its state across native storage resizes", async () => {
    const readComponents = vi.fn();
    const mounted = vi.fn();
    const cleaned = vi.fn();
    const declaration: DockTabRegistration = {
      id: "resource",
      title: "Resource",
      get components() {
        readComponents();
        return {
          Tab: function Content() {
            const [count, setCount] = useState(0);

            useEffect(() => {
              mounted();
              return () => cleaned();
            }, []);

            return (
              <button type="button" onClick={() => setCount(count + 1)}>
                Count {count}
              </button>
            );
          },
        };
      },
    };
    const extension = makeExtension("/lazy-components/package.json", [declaration]);
    await register(extension);
    const store = di.inject(dockStoreInjectable);
    store.tabs = [];
    extension.openDockTab("resource");
    expect(readComponents).not.toHaveBeenCalled();

    const view = renderDock();
    fireEvent.click(view.getByRole("button", { name: "Count 0" }));
    for (let height = 310; height < 322; height++) {
      act(() => {
        store.height = height;
      });
    }

    expect(view.getByRole("button", { name: "Count 1" })).toBeInTheDocument();
    expect(readComponents).toHaveBeenCalledTimes(1);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(cleaned).not.toHaveBeenCalled();
  });

  it.each([
    { initial: "visible", end: "close" },
    { initial: "hidden", end: "disable" },
  ] as const)(
    "preserves the draft and pauses one subscription from an initially $initial document, then cleans up on $end",
    async ({ initial, end }) => {
      let activeSubscriptions = 0;
      let peakSubscriptions = 0;
      const subscribe = () => {
        activeSubscriptions++;
        peakSubscriptions = Math.max(peakSubscriptions, activeSubscriptions);
        return () => {
          activeSubscriptions--;
        };
      };
      const Content = () => {
        const [draft, setDraft] = useState("");
        useEffect(() => {
          let unsubscribe: (() => void) | undefined;
          const stop = () => {
            unsubscribe?.();
            unsubscribe = undefined;
          };
          const sync = () => {
            if (document.hidden) stop();
            else unsubscribe ??= subscribe();
          };

          document.addEventListener("visibilitychange", sync);
          sync();

          return () => {
            document.removeEventListener("visibilitychange", sync);
            stop();
          };
        }, []);

        return <input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} />;
      };
      const visibility = mockDocumentVisibility(initial === "hidden");

      try {
        const extension = makeExtension("/subscription/package.json", [
          { id: "resource", title: "Resource", components: { Tab: Content } },
        ]);
        await register(extension);
        di.inject(dockStoreInjectable).tabs = [];
        const tabId = extension.openDockTab("resource");
        const view = renderDock();

        expect(activeSubscriptions).toBe(initial === "hidden" ? 0 : 1);
        fireEvent.change(view.getByRole("textbox", { name: "Draft" }), { target: { value: "Unsaved filter" } });

        if (initial === "hidden") {
          visibility.setHidden(false);
          expect(activeSubscriptions).toBe(1);
        }

        for (let cycle = 0; cycle < 2; cycle++) {
          visibility.setHidden(true);
          expect(activeSubscriptions).toBe(0);
          visibility.setHidden(false);
          expect(activeSubscriptions).toBe(1);
          expect(view.getByRole("textbox", { name: "Draft" })).toHaveValue("Unsaved filter");
        }
        expect(peakSubscriptions).toBe(1);

        if (end === "disable") {
          await act(async () => extension.disable());
          expect(view.getByText(/extension is unavailable or disabled/)).toBeInTheDocument();
        } else {
          fireEvent.click(view.getByTestId(`dock-tab-close-for-${tabId}`));
        }
        expect(view.queryByRole("textbox", { name: "Draft" })).not.toBeInTheDocument();
        expect(activeSubscriptions).toBe(0);

        visibility.setHidden(true);
        visibility.setHidden(false);
        expect(activeSubscriptions).toBe(0);
      } finally {
        visibility.restore();
      }
    },
  );

  it("lets an in-flight fetch finish while hidden without aborting or restarting it", async () => {
    const request = Promise.withResolvers<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(request.promise);
    const visibility = mockDocumentVisibility(false);
    const Content = () => {
      const [result, setResult] = useState("Loading summary");
      useEffect(() => {
        const controller = new AbortController();

        void globalThis
          .fetch("https://example.com/summary", { signal: controller.signal })
          .then((response) => response.text())
          .then((summary) => {
            if (!controller.signal.aborted) setResult(summary);
          });

        return () => controller.abort();
      }, []);

      return <span>{result}</span>;
    };

    try {
      const extension = makeExtension("/request/package.json", [
        { id: "summary", title: "Summary", components: { Tab: Content } },
      ]);
      await register(extension);
      di.inject(dockStoreInjectable).tabs = [];
      extension.openDockTab("summary");
      const view = renderDock();
      expect(view.getByText("Loading summary")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const signal = fetchMock.mock.calls[0][1]?.signal;

      visibility.setHidden(true);
      expect(signal?.aborted).toBe(false);
      await act(async () => request.resolve(new Response("Summary received")));
      visibility.setHidden(false);

      expect(view.getByText("Summary received")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(signal?.aborted).toBe(false);
    } finally {
      visibility.restore();
      fetchMock.mockRestore();
    }
  });

  it.each(["minimize", "cluster", "selection", "disable"] as const)(
    "stops component interval work on %s and starts a fresh visible lifetime",
    async (reason) => {
      const tick = vi.fn();
      const mounted = vi.fn();
      const cleaned = vi.fn();
      const Content = () => {
        useEffect(() => {
          mounted();
          const timer = setInterval(tick, 100);
          return () => {
            clearInterval(timer);
            cleaned();
          };
        }, []);
        return <button type="button">Live content</button>;
      };
      const extension = makeExtension("/timer/package.json", [
        { id: "active", title: "Active", components: { Tab: Content } },
        { id: "idle", title: "Idle", components: { Tab: () => null } },
      ]);
      await register(extension);
      const store = di.inject(dockStoreInjectable);
      store.tabs = [];
      const selected = extension.openDockTab("active");
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
      const view = renderDock();
      act(() => vi.advanceTimersByTime(300));
      expect(tick).toHaveBeenCalledTimes(3);

      await act(async () => {
        if (reason === "minimize") store.close();
        if (reason === "cluster") visible.active = false;
        if (reason === "selection") extension.openDockTab("idle");
        if (reason === "disable") await extension.disable();
      });
      expect(view.queryByText("Live content")).not.toBeInTheDocument();
      expect(cleaned).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(500));
      expect(tick).toHaveBeenCalledTimes(3);

      await act(async () => {
        if (reason === "minimize") store.open();
        if (reason === "cluster") visible.active = true;
        if (reason === "selection") store.selectTab(selected);
        if (reason === "disable") await extension.enable();
      });
      expect(view.getByText("Live content")).toBeInTheDocument();
      expect(mounted).toHaveBeenCalledTimes(2);
      act(() => vi.advanceTimersByTime(100));
      expect(tick).toHaveBeenCalledTimes(4);
      view.unmount();
      expect(cleaned).toHaveBeenCalledTimes(2);
      act(() => vi.advanceTimersByTime(100));
      expect(tick).toHaveBeenCalledTimes(4);
    },
  );

  it("uses the native dock keyboard selection, close, and minimize actions for extension tabs", async () => {
    const extension = makeExtension("/keyboard/package.json", [
      {
        id: "resource",
        title: "Resource",
        components: { Tab: ({ params }) => <button type="button">{String(params.resource)}</button> },
      },
    ]);
    await register(extension);
    const store = di.inject(dockStoreInjectable);
    store.tabs = [];
    const first = extension.openDockTab("resource", { params: { resource: "First resource" } });
    const second = extension.openDockTab("resource", { params: { resource: "Second resource" } });
    const view = renderDock();

    view.getByText("Second resource").focus();
    fireEvent.keyDown(document, { code: "Comma", ctrlKey: true });
    expect(store.selectedTabId).toBe(first);
    expect(view.getByText("First resource")).toBeInTheDocument();
    fireEvent.keyDown(document, { code: "Period", ctrlKey: true });
    expect(store.selectedTabId).toBe(second);
    fireEvent.keyDown(document, { code: "KeyW", ctrlKey: true });
    expect(store.tabs.map((tab) => tab.id)).toEqual([first]);
    expect(store.selectedTabId).toBe(first);
    fireEvent.keyDown(document, { code: "Escape", shiftKey: true });
    expect(store.isOpen).toBe(false);
    expect(view.queryByText("First resource")).not.toBeInTheDocument();
  });

  it.each([
    { version: 1, available: false },
    { version: 99, available: false },
    { version: 1, available: true },
  ])(
    "keeps restored extension descriptors closable even when pinned was persisted ($version, available $available)",
    async ({ version, available }) => {
      const tabId = "restored-pinned";
      di.inject(lensLocalStorageStateInjectable).dock = {
        height: 300,
        isOpen: true,
        selectedTabId: tabId,
        tabs: [
          {
            id: tabId,
            kind: TabKind.EXTENSION,
            title: version === 99 ? { invalid: true } : "Restored pinned resource",
            pinned: true,
            extensionTab: { version, extensionName: "@example/boundary", typeId: "resource", params: {} },
          },
        ],
      };
      if (available) {
        await register(
          makeExtension("/pinned/package.json", [
            { id: "resource", title: "Resource", components: { Tab: () => <span>Available pinned content</span> } },
          ]),
        );
      }
      const view = renderDock();
      const store = di.inject(dockStoreInjectable);
      expect(view.getByTestId(`dock-tab-for-${tabId}`)).toHaveTextContent(
        version === 99 ? "Extension tab" : "Restored pinned resource",
      );
      expect(di.inject(dockStorageInjectable).get().tabs[0].pinned).toBe(false);
      if (available) expect(view.getByText("Available pinned content")).toBeInTheDocument();
      expect(view.getByTestId(`dock-tab-close-for-${tabId}`)).toBeInTheDocument();
      fireEvent.click(view.getByTestId(`dock-tab-close-for-${tabId}`));
      expect(store.tabs).toHaveLength(0);
      expect(store.isOpen).toBe(false);
    },
  );

  it("preserves the native pinned-tab behavior when loading the dock", () => {
    di.inject(lensLocalStorageStateInjectable).dock = {
      height: 300,
      isOpen: true,
      selectedTabId: "native-pinned",
      tabs: [{ id: "native-pinned", kind: TabKind.CREATE_RESOURCE, title: "Native pinned", pinned: true }],
    };
    const store = di.inject(dockStoreInjectable);
    expect(store.selectedTab?.pinned).toBe(true);
    store.closeTab("native-pinned");
    expect(store.tabs).toHaveLength(1);
  });
});
