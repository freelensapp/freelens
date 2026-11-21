/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { DiContextProvider } from "@ogre-tools/injectable-react";
import { act, fireEvent, render } from "@testing-library/react";
import { computed, observable } from "mobx";
import { Component, useEffect, useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../../common/cluster/cluster";
import extensionInjectable from "../../../../extensions/extension-loader/extension/extension.injectable";
import catalogEntityRegistryInjectable from "../../../api/catalog/entity/registry.injectable";
import activeKubernetesClusterInjectable from "../../../cluster-frame-context/active-kubernetes-cluster.injectable";
import hostedClusterInjectable from "../../../cluster-frame-context/hosted-cluster.injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../../routes/currently-in-cluster-frame.injectable";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { getExtensionFakeForRenderer } from "../../test-utils/get-extension-fake";
import createResourceTemplatesInjectable from "../create-resource/create-resource-templates.injectable";
import { Dock } from "../dock";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { CatalogEntity } from "../../../../common/catalog";
import type { KubernetesCluster } from "../../../../common/catalog-entities";
import type { Extension } from "../../../../extensions/extension-loader/extension/extension.injectable";
import type { DockTabRegistration, ExtensionDockTabProps } from "./dock-tab-registration";

describe("extension dock error isolation", () => {
  let di: DiContainer;
  let registrations: Extension[];
  let visible: { active: boolean };

  const register = async (name: string, dockTabs: DockTabRegistration[]) => {
    const extension = getExtensionFakeForRenderer({
      id: `/installed/${name}/package.json`,
      name,
      rendererOptions: { dockTabs },
    });
    const registration = di.inject(extensionInjectable, extension);
    registrations.push(registration);
    registration.register();
    await extension.enable();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    return extension;
  };

  const renderDock = () =>
    render(
      <DiContextProvider value={di}>
        <Dock />
      </DiContextProvider>,
    );

  const registerHealthy = () =>
    register("@example/healthy", [
      { id: "healthy", title: "Healthy", components: { Tab: () => <span>Healthy content</span> } },
    ]);

  beforeEach(() => {
    registrations = [];
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/test-user-data");
    di.override(hostedClusterIdInjectable, () => "isolation-cluster");
    di.override(currentlyInClusterFrameInjectable, () => true);
    di.override(activeKubernetesClusterInjectable, () =>
      computed(() => ({ getId: () => "isolation-cluster" }) as KubernetesCluster),
    );
    visible = observable({ active: true });
    vi.spyOn(di.inject(catalogEntityRegistryInjectable), "getById").mockReturnValue({
      status: visible,
    } as CatalogEntity);
    Element.prototype.scrollIntoView = vi.fn();
    di.inject(dockStoreInjectable).tabs = [];
  });

  afterEach(() => {
    registrations.forEach((registration) => registration.deregister());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("only reads the components getter for the selected declaration and retries a failed lookup", async () => {
    const fail = observable.box(true);
    const readComponents = vi.fn(() => {
      if (fail.get()) throw new Error("components getter failure");
      return { Tab: () => <span>Recovered declaration</span> };
    });
    const broken = await register("@example/broken-declaration", [
      {
        id: "broken",
        title: "Broken",
        get components() {
          return readComponents();
        },
      },
    ]);
    const healthy = await registerHealthy();
    const neighbor = healthy.openDockTab("healthy");
    const view = renderDock();
    expect(view.getByText("Healthy content")).toBeInTheDocument();
    expect(readComponents).not.toHaveBeenCalled();

    vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => {
      broken.openDockTab("broken");
    });
    expect(view.getByRole("alert")).toHaveTextContent("components getter failure");
    act(() => fail.set(false));
    expect(view.getByText("Recovered declaration")).toBeInTheDocument();
    act(() => di.inject(dockStoreInjectable).selectTab(neighbor));
    expect(view.getByText("Healthy content")).toBeInTheDocument();
  });

  it.each(["enabled", "component"] as const)(
    "isolates a throwing %s resolver and recovers reactively",
    async (resolver) => {
      const fail = observable.box(false);
      const Healthy = () => <span>Recovered content</span>;
      const broken = await register("@example/resolver", [
        {
          id: "broken",
          title: "Broken",
          enabled: computed(() => {
            if (resolver === "enabled" && fail.get()) throw new Error("resolver failure");
            return true;
          }),
          components: {
            get Tab() {
              if (resolver === "component" && fail.get()) throw new Error("resolver failure");
              return Healthy;
            },
          },
        },
      ]);
      const healthy = await registerHealthy();
      const neighbor = healthy.openDockTab("healthy");
      const selected = broken.openDockTab("broken");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const view = renderDock();

      expect(view.getByText("Recovered content")).toBeInTheDocument();
      act(() => fail.set(true));
      expect(view.getByText(/Error: resolver failure/)).toBeInTheDocument();
      act(() => di.inject(dockStoreInjectable).selectTab(neighbor));
      expect(view.getByText("Healthy content")).toBeInTheDocument();
      act(() => di.inject(dockStoreInjectable).selectTab(selected));
      expect(view.getByText(/Error: resolver failure/)).toBeInTheDocument();
      act(() => fail.set(false));
      expect(view.getByText("Recovered content")).toBeInTheDocument();
      expect(view.queryByText(/App crash/)).not.toBeInTheDocument();
      view.unmount();
      log.mockRestore();
    },
  );

  it.each([
    ...(["selection", "close", "minimize", "cluster", "document", "disable"] as const).map((reason) => ({
      reason,
      cleanup: "effect" as const,
    })),
    ...(["layout", "class"] as const).flatMap((cleanup) =>
      (["selection", "close", "minimize"] as const).map((reason) => ({ reason, cleanup })),
    ),
  ])(
    "isolates throwing $cleanup cleanup on $reason and gives the next visible mount a fresh boundary",
    async ({ reason, cleanup }) => {
      const mounted = vi.fn();
      const cleaned = vi.fn();
      const tick = vi.fn();
      const start = () => {
        mounted();
        const timer = setInterval(tick, 100);
        return () => {
          clearInterval(timer);
          cleaned();
          throw new Error("cleanup failure");
        };
      };
      const useCleanupEffect = cleanup === "layout" ? useLayoutEffect : useEffect;
      const EffectContent = () => {
        useCleanupEffect(start, []);
        return <span>Cleanup content</span>;
      };
      class ClassContent extends Component<ExtensionDockTabProps> {
        private cleanup?: () => void;

        componentDidMount() {
          this.cleanup = start();
        }

        componentWillUnmount() {
          this.cleanup?.();
        }

        render() {
          return <span>Cleanup content</span>;
        }
      }
      const Content = cleanup === "class" ? ClassContent : EffectContent;
      const broken = await register("@example/cleanup", [
        { id: "broken", title: "Broken", components: { Tab: Content } },
      ]);
      const healthy = await registerHealthy();
      const neighbor = healthy.openDockTab("healthy");
      const selected = broken.openDockTab("broken");
      const store = di.inject(dockStoreInjectable);
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      const hidden = vi.spyOn(document, "hidden", "get");
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
      const view = renderDock();

      try {
        act(() => vi.advanceTimersByTime(200));
        expect(tick).toHaveBeenCalledTimes(2);
        await act(async () => {
          if (reason === "selection") store.selectTab(neighbor);
          if (reason === "close") store.closeTab(selected);
          if (reason === "minimize") store.close();
          if (reason === "cluster") visible.active = false;
          if (reason === "document") {
            hidden.mockReturnValue(true);
            fireEvent(document, new Event("visibilitychange"));
          }
          if (reason === "disable") await broken.disable();
        });
        expect(cleaned).toHaveBeenCalledTimes(1);
        expect(view.queryByText("Cleanup content")).not.toBeInTheDocument();
        for (const crash of view.queryAllByText(/App crash/)) expect(crash).not.toBeVisible();
        act(() => vi.advanceTimersByTime(300));
        expect(tick).toHaveBeenCalledTimes(2);

        await act(async () => {
          store.selectTab(neighbor);
          store.open();
          visible.active = true;
          hidden.mockReturnValue(false);
          fireEvent(document, new Event("visibilitychange"));
          if (reason === "disable") await broken.enable();
        });
        expect(view.getByText("Healthy content")).toBeInTheDocument();
        if (reason !== "close") {
          act(() => store.selectTab(selected));
          expect(view.getByText("Cleanup content")).toBeInTheDocument();
          expect(mounted).toHaveBeenCalledTimes(2);
          act(() => store.closeTab(selected));
          expect(view.getByText("Healthy content")).toBeInTheDocument();
          expect(cleaned).toHaveBeenCalledTimes(2);
        }
        view.unmount();
      } finally {
        hidden.mockRestore();
        log.mockRestore();
        vi.useRealTimers();
      }
    },
  );

  it("keeps the native resource editor usable after extension cleanup throws", async () => {
    di.override(createResourceTemplatesInjectable, () => computed(() => []));
    di.override(
      hostedClusterInjectable,
      () => new Cluster({ id: "isolation-cluster", contextName: "test", kubeConfigPath: "/test-kubeconfig" }),
    );
    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    const Content = () => {
      useEffect(
        () => () => {
          throw new Error("cleanup failure");
        },
        [],
      );
      return <span>Cleanup content</span>;
    };
    const broken = await register("@example/native-neighbor", [
      { id: "broken", title: "Broken", components: { Tab: Content } },
    ]);
    const store = di.inject(dockStoreInjectable);
    const native = store.createTab({ kind: TabKind.CREATE_RESOURCE, title: "Native editor" });
    broken.openDockTab("broken");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const view = renderDock();

    act(() => store.selectTab(native.id));
    expect(await view.findByText("Select Template ...")).toBeInTheDocument();
    for (const crash of view.queryAllByText(/App crash/)) expect(crash).not.toBeVisible();
    view.unmount();
    log.mockRestore();
  });
});
