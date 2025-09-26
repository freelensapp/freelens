/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SidebarItemDeclaration } from "@freelensapp/cluster-sidebar";
import { sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import styles from "./sidebar.module.scss";
import { SidebarCluster } from "./sidebar-cluster";
import { SidebarItem } from "./sidebar-item";
import type { IComputedValue } from "mobx";

import type {CatalogEntityRegistry} from "../../api/catalog/entity/registry";
import SortableList from "../orderable-list/sortable-list";
import userPreferencesStateInjectable, {
  UserPreferencesState
} from "../../../features/user-preferences/common/state.injectable";
import useSidebarHook from "./sidebar-hook";

interface Dependencies {
  sidebarItems: IComputedValue<SidebarItemDeclaration[]>;
  entityRegistry: CatalogEntityRegistry;
  userPreferencesState: UserPreferencesState;
}

const NonInjectedSidebar = observer((
  {
    sidebarItems,
    entityRegistry,
    userPreferencesState
  }: Dependencies) => {

  const sidebarHook = useSidebarHook({ userPreferencesState });

  return (
    <div className={cssNames("flex flex-col")} data-testid="cluster-sidebar">
      <SidebarCluster clusterEntity={entityRegistry.activeEntity}/>

      <SortableList
        className={`${styles.sidebarNav} sidebar-active-status`}
        onReorder={sidebarHook.saveOrderInfo}
      >
        {sidebarItems.get().map((hierarchicalSidebarItem) => (
          <SidebarItem item={hierarchicalSidebarItem} key={hierarchicalSidebarItem.id}/>
        ))}
      </SortableList>
    </div>
  )
});

export const Sidebar = withInjectables<Dependencies>(NonInjectedSidebar, {
  getProps: (di, props) => ({
    ...props,
    sidebarItems: di.inject(sidebarItemsInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
    userPreferencesState: di.inject(userPreferencesStateInjectable),
  }),
});

Sidebar.displayName = "Sidebar";
