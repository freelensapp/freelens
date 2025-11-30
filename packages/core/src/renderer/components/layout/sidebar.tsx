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
import userPreferencesStateInjectable, {
  UserPreferencesState,
} from "../../../features/user-preferences/common/state.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import OrderableList from "../orderable-list/orderable-list";
import styles from "./sidebar.module.scss";
import { SidebarCluster } from "./sidebar-cluster";
import useSidebarHook from "./sidebar-hook";
import { SidebarItem } from "./sidebar-item";

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";

import type { IComputedValue } from "mobx";

import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";

interface Dependencies {
  sidebarItems: IComputedValue<SidebarItemDeclaration[]>;
  entityRegistry: CatalogEntityRegistry;
  userPreferences: UserPreferencesState;
}

const NonInjectedSidebar = observer(
  ({ sidebarItems, entityRegistry, userPreferences: sidebarStorage }: Dependencies) => {
    const sidebarHook = useSidebarHook({ userPreferences: sidebarStorage });

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
  }),
});

Sidebar.displayName = "Sidebar";
