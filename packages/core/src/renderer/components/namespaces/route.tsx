/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./namespaces.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import React from "react";
import { Badge } from "../badge";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { TabLayout } from "../layout/tab-layout-2";
import { WithTooltip } from "../with-tooltip";
import { AddNamespaceDialog } from "./add-dialog/dialog";
import openAddNamespaceDialogInjectable from "./add-dialog/open.injectable";
import requestDeleteNamespaceInjectable from "./request-delete-namespace.injectable";
import namespaceStoreInjectable from "./store.injectable";
import { SubnamespaceBadge } from "./subnamespace-badge";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { RequestDeleteNamespace } from "./request-delete-namespace.injectable";
import type { NamespaceStore } from "./store";
import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";

enum columnId {
  name = "name",
  labels = "labels",
  age = "age",
  status = "status",
}

interface Dependencies {
  namespaceStore: NamespaceStore;
  openAddNamespaceDialog: () => void;
  requestDeleteNamespace: RequestDeleteNamespace;
  userPreferencesState: UserPreferencesState;
}

const NonInjectedNamespacesRoute = ({
  namespaceStore,
  openAddNamespaceDialog,
  requestDeleteNamespace,
  userPreferencesState,
}: Dependencies) => {
  const store = {
    api: namespaceStore.api,
    get contextItems() {
      return namespaceStore.contextItems;
    },
    get failedLoading() {
      return namespaceStore.failedLoading;
    },
    get isLoaded() {
      return namespaceStore.isLoaded;
    },
    get selectedItems() {
      return namespaceStore.selectedItems;
    },
    getByPath: (...params: Parameters<NamespaceStore["getByPath"]>) => namespaceStore.getByPath(...params),
    getTotalCount: (...params: Parameters<NamespaceStore["getTotalCount"]>) => namespaceStore.getTotalCount(...params),
    isSelected: (...params: Parameters<NamespaceStore["isSelected"]>) => namespaceStore.isSelected(...params),
    isSelectedAll: (...params: Parameters<NamespaceStore["isSelectedAll"]>) => namespaceStore.isSelectedAll(...params),
    loadAll: (...params: Parameters<NamespaceStore["loadAll"]>) => namespaceStore.loadAll(...params),
    subscribe: () => namespaceStore.subscribe(),
    toggleSelection: (...params: Parameters<NamespaceStore["toggleSelection"]>) =>
      namespaceStore.toggleSelection(...params),
    toggleSelectionAll: (...params: Parameters<NamespaceStore["toggleSelectionAll"]>) =>
      namespaceStore.toggleSelectionAll(...params),
    pickOnlySelected: (...params: Parameters<NamespaceStore["pickOnlySelected"]>) =>
      namespaceStore.pickOnlySelected(...params),
    removeItems: async (items: Parameters<RequestDeleteNamespace>[0][]) => {
      if (userPreferencesState.allowDelete !== false) {
        await Promise.all(items.map(requestDeleteNamespace));
      }
    },
    removeSelectedItems: async () => {
      if (userPreferencesState.allowDelete !== false) {
        await Promise.all(namespaceStore.selectedItems.map(requestDeleteNamespace));
      }
    },
  };

  return (
    <TabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="namespaces"
        className="Namespaces"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (namespace) => namespace.getName(),
          [columnId.labels]: (namespace) => namespace.getLabels(),
          [columnId.age]: (namespace) => -namespace.getCreationTimestamp(),
          [columnId.status]: (namespace) => namespace.getStatus(),
        }}
        searchFilters={[(namespace) => namespace.getSearchFields(), (namespace) => namespace.getStatus()]}
        renderHeaderTitle="Namespaces"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Labels", className: "labels scrollable", sortBy: columnId.labels, id: columnId.labels },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
        ]}
        renderTableContents={(namespace) => [
          <>
            <WithTooltip>{namespace.getName()}</WithTooltip>
            {namespace.isSubnamespace() && (
              <SubnamespaceBadge className="subnamespaceBadge" id={`namespace-list-badge-for-${namespace.getId()}`} />
            )}
          </>,
          <WithTooltip tooltip={namespace.getLabels().join(", ")} key="labels">
            {namespace.getLabels().map((label) => (
              <Badge scrollable key={label} label={label} />
            ))}
          </WithTooltip>,
          <KubeObjectAge key="age" object={namespace} />,
          { title: namespace.getStatus(), className: namespace.getStatus().toLowerCase() },
        ]}
        addRemoveButtons={{
          addTooltip: "Add Namespace",
          onAdd: openAddNamespaceDialog,
        }}
      />
      <AddNamespaceDialog />
    </TabLayout>
  );
};

export const NamespacesRoute = withInjectables<Dependencies>(NonInjectedNamespacesRoute, {
  getProps: (di) => ({
    namespaceStore: di.inject(namespaceStoreInjectable),
    openAddNamespaceDialog: di.inject(openAddNamespaceDialogInjectable),
    requestDeleteNamespace: di.inject(requestDeleteNamespaceInjectable),
    userPreferencesState: di.inject(userPreferencesStateInjectable),
  }),
});
