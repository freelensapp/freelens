/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { SidebarItemDeclaration, sidebarItemsInjectable } from "@freelensapp/cluster-sidebar";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import userPreferencesStateInjectable, {
  UserPreferencesState,
} from "../../../features/user-preferences/common/state.injectable";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import favoritesSidebarItemInjectable from "../favorites/sidebar-item.injectable";
import favoritesSidebarItemsComputedInjectable from "../favorites/sidebar-items-computed.injectable";
import OrderableList from "../orderable-list/orderable-list";
import styles from "./sidebar.module.scss";
import { SidebarCluster } from "./sidebar-cluster";
import useSidebarHook from "./sidebar-hook";
import { SidebarItem } from "./sidebar-item";

import type { IComputedValue } from "mobx";

import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";

interface Dependencies {
  sidebarItems: IComputedValue<SidebarItemDeclaration[]>;
  entityRegistry: CatalogEntityRegistry;
  userPreferences: UserPreferencesState;
  favoritesSidebarItems: IComputedValue<SidebarItemDeclaration[]>;
}

const NonInjectedSidebar = observer(
  ({ sidebarItems, entityRegistry, userPreferences: sidebarStorage, favoritesSidebarItems }: Dependencies) => {
    const sidebarHook = useSidebarHook({ userPreferences: sidebarStorage });
    const favoritesMainEntry = sidebarItems.get().find((item) => item.id === favoritesSidebarItemInjectable.id);
    const favoritesEntries = favoritesSidebarItems.get();

    const favoritesWithChildren = favoritesMainEntry
      ? {
          ...favoritesMainEntry,
          children: favoritesEntries,
        }
      : null;

    return (
      <div className={cssNames("flex flex-col")} data-testid="cluster-sidebar">
        <SidebarCluster clusterEntity={entityRegistry.activeEntity} />

        <OrderableList className={`${styles.sidebarNav} sidebar-active-status`} onReorder={sidebarHook.saveOrderInfo}>
          {sidebarItems.get().map((item) => {
            if (item.id === favoritesSidebarItemInjectable.id && favoritesWithChildren) {
              return <SidebarItem item={favoritesWithChildren} key={favoritesWithChildren.id} />;
            }
            return <SidebarItem item={item} key={item.id} />;
          })}
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
    favoritesSidebarItems: di.inject(favoritesSidebarItemsComputedInjectable),
  }),
});

Sidebar.displayName = "Sidebar";
