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
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import SortableList from "../orderable-list/sortable-list";
import useSidebarHook from "./sidebar-hook";
import sidebarStorageInjectable, { SidebarStorageState } from "./sidebar-storage/sidebar-storage.injectable";
import type { StorageLayer } from "../../utils/storage-helper";
import extensionLoaderInjectable from "../../../extensions/extension-loader/extension-loader.injectable";
import { ExtensionLoader } from "../../../extensions/extension-loader";

interface Dependencies {
  sidebarItems: IComputedValue<SidebarItemDeclaration[]>;
  entityRegistry: CatalogEntityRegistry;
  sidebarStorage: StorageLayer<SidebarStorageState>;
  extensionLoader: ExtensionLoader;
}

const NonInjectedSidebar = observer((
  {
    sidebarItems,
    entityRegistry,
    sidebarStorage,
    extensionLoader,
  }: Dependencies) => {

  const sidebarHook = useSidebarHook({ sidebarStorage, extensionLoader });

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
    sidebarStorage: di.inject(sidebarStorageInjectable),
    extensionLoader: di.inject(extensionLoaderInjectable)
  }),
});

Sidebar.displayName = "Sidebar";
