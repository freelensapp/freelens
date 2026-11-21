/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { computed } from "mobx";
import { observer } from "mobx-react";
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import catalogEntityRegistryInjectable from "../../../api/catalog/entity/registry.injectable";
import hostedClusterIdInjectable from "../../../cluster-frame-context/hosted-cluster-id.injectable";
import { TabKind } from "../dock/store";
import dockStoreInjectable from "../dock/store.injectable";
import { readExtensionDockTabData } from "./params";
import registeredDockTabsInjectable from "./registered-dock-tabs.injectable";

import type { IComputedValue } from "mobx";

import type { DockStore, DockTab } from "../dock/store";
import type { RegisteredDockTab } from "./registered-dock-tabs.injectable";

interface Props {
  tab: DockTab;
  active: boolean;
  visible: boolean;
  height: number;
  registrations: IComputedValue<RegisteredDockTab[]>;
  dockStore: DockStore;
}

interface Dependencies {
  registrations: IComputedValue<RegisteredDockTab[]>;
  dockStore: DockStore;
  clusterIsVisible: IComputedValue<boolean>;
}

const ThrowError = ({ error }: { error: unknown }): never => {
  throw error;
};

interface BoundaryProps {
  resetKey: number;
  children: React.ReactNode;
}

interface BoundaryState {
  resetKey: number;
  failed: boolean;
  error?: unknown;
}

// This boundary must receive children synchronously: an injectable wrapper can
// defer the empty children until after the closed tab's shell is retired.
class ExtensionDockTabBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { resetKey: 0, failed: false };

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    return props.resetKey !== state.resetKey ? { resetKey: props.resetKey, failed: false, error: undefined } : null;
  }

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { failed: true, error };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    let message = "Unknown extension error";

    try {
      message = String(this.state.error);
    } catch {
      // A thrown extension value can have a failing toString implementation.
    }

    return (
      <div className="p-4" role="alert">
        This extension tab failed. Close it or switch tabs to retry.
        <pre>{message}</pre>
      </div>
    );
  }
}

const ExtensionDockTab = observer(({ tab, active, visible, height, registrations, dockStore }: Props) => {
  const { id } = tab;
  const savedDescriptor = active ? tab.extensionTab : undefined;
  const descriptor = useMemo(() => {
    if (savedDescriptor === undefined) return {};

    try {
      return { data: readExtensionDockTabData(savedDescriptor) };
    } catch (error) {
      return { error };
    }
  }, [savedDescriptor]);
  const close = useCallback(() => dockStore.closeTab(id), [dockStore, id]);
  let registration: RegisteredDockTab | undefined;
  let content: React.ReactNode = null;
  let message: React.ReactNode = null;
  let mounted = false;

  // Keep resolution observable even after the boundary catches an error, so a
  // repaired computed or reloaded registration can start a fresh mount.
  if (active) {
    try {
      if ("error" in descriptor) throw descriptor.error;

      const { data } = descriptor;

      if (!data) {
        message = (
          <div className="p-4">
            This tab's saved parameters are invalid. Close it and open a new tab from the extension.
          </div>
        );
      } else {
        registration = registrations
          .get()
          .find((item) => item.extensionName === data.extensionName && item.id === data.typeId);

        if (!registration?.enabled.get()) {
          message = (
            <div className="p-4">
              This tab's extension is unavailable or disabled. You can close the tab or enable its extension.
            </div>
          );
        } else if (visible) {
          const Component = registration.components.Tab;

          mounted = true;
          content = <Component tabId={id} params={data.params} close={close} />;
        }
      }
    } catch (error) {
      content = <ThrowError error={error} />;
    }
  }

  const lifetime = useRef({ mounted, registration, key: 0 });

  if (lifetime.current.mounted !== mounted || lifetime.current.registration !== registration) {
    lifetime.current = { mounted, registration, key: lifetime.current.key + 1 };
  }

  return (
    <div
      className="tab-content extension"
      style={{ flexBasis: height }}
      hidden={!active}
      data-testid={`dock-tab-content-for-${id}`}
    >
      <div className="h-full">
        {message}
        <div className="h-full" hidden={!content}>
          <ExtensionDockTabBoundary resetKey={lifetime.current.key}>{content}</ExtensionDockTabBoundary>
        </div>
      </div>
    </div>
  );
});

const getDocumentVisibility = () => !document.hidden;

const subscribeToDocumentVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);

  return () => document.removeEventListener("visibilitychange", onChange);
};

const NonInjectedExtensionDockTabs = observer(({ registrations, dockStore, clusterIsVisible }: Dependencies) => {
  const tabs = dockStore.tabs.filter((tab) => tab.kind === TabKind.EXTENSION);
  const [retainedTabs, setRetainedTabs] = useState(tabs);
  const documentVisible = useSyncExternalStore(subscribeToDocumentVisibility, getDocumentVisibility);
  const currentIds = new Set(tabs.map((tab) => tab.id));
  const retiringTabs = retainedTabs.filter((tab) => !currentIds.has(tab.id));

  // A closed tab first loses its content under its surviving boundary. Remove
  // the now-empty shell on the next render, after effect cleanup has run.
  useEffect(() => {
    if (retainedTabs.length !== tabs.length || retainedTabs.some((tab, index) => tab !== tabs[index])) {
      setRetainedTabs(tabs);
    }
  });

  return [...tabs, ...retiringTabs].map((tab) => (
    <ExtensionDockTab
      key={tab.id}
      tab={tab}
      active={currentIds.has(tab.id) && dockStore.isOpen && dockStore.selectedTabId === tab.id}
      visible={clusterIsVisible.get() && documentVisible}
      height={dockStore.height}
      registrations={registrations}
      dockStore={dockStore}
    />
  ));
});

export const ExtensionDockTabs = withInjectables<Dependencies>(NonInjectedExtensionDockTabs, {
  getProps: (di, props) => {
    const clusterId = di.inject(hostedClusterIdInjectable);
    const catalogEntityRegistry = di.inject(catalogEntityRegistryInjectable);

    return {
      ...props,
      registrations: di.inject(registeredDockTabsInjectable),
      dockStore: di.inject(dockStoreInjectable),
      // Root frame reports visibility through main's catalog synchronization.
      // A retained cluster iframe's own activeEntity is not a visibility signal.
      clusterIsVisible: computed(() => !!clusterId && catalogEntityRegistry.getById(clusterId)?.status.active === true),
    };
  },
});
