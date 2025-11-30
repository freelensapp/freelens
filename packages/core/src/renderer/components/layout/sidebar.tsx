/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { ExtensionLoader } from "../../../extensions/extension-loader";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import OrderableList from "../orderable-list/orderable-list";
import styles from "./sidebar.module.scss";
import { SidebarCluster } from "./sidebar-cluster";
import useSidebarHook from "./sidebar-hook";
import { SidebarItem } from "./sidebar-item";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { IComputedValue } from "mobx";

import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import userPreferencesStateInjectable, { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

interface Dependencies {
  sidebarItems: IComputedValue<SidebarItemDeclaration[]>;
  entityRegistry: CatalogEntityRegistry;
  userPreferences: UserPreferencesState;
  extensionLoader: ExtensionLoader;
}

const NonInjectedSidebar = observer(
  ({ sidebarItems, entityRegistry, userPreferences: sidebarStorage, extensionLoader }: Dependencies) => {
    const sidebarHook = useSidebarHook({ userPreferences: sidebarStorage, extensionLoader });

    return (
      <div className={cssNames("flex flex-col")} data-testid="cluster-sidebar">
        <SidebarCluster clusterEntity={entityRegistry.activeEntity} />

        <OrderableList className={`${styles.sidebarNav} sidebar-active-status`} onReorder={sidebarHook.saveOrderInfo}>
          {sidebarItems.get().map((hierarchicalSidebarItem) => (
            <SidebarItem item={hierarchicalSidebarItem} key={hierarchicalSidebarItem.id} />
          ))}
        </OrderableList>
      </div>
    );
  },
);

export const Sidebar = withInjectables<Dependencies>(NonInjectedSidebar, {
  getProps: (di, props) => ({
    ...props,
    sidebarItems: di.inject(sidebarItemsInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
    userPreferences: di.inject(userPreferencesStateInjectable),
    extensionLoader: di.inject(extensionLoaderInjectable),
  }),
});

Sidebar.displayName = "Sidebar";
