/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./view.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../../kube-object/age";
import { LinkToClusterRole } from "../../kube-object-link";
import { KubeObjectListLayout } from "../../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../../kube-object-status-icon";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import { WithTooltip } from "../../with-tooltip";
import clusterRoleStoreInjectable from "../cluster-roles/store.injectable";
import serviceAccountStoreInjectable from "../service-accounts/store.injectable";
import openClusterRoleBindingDialogInjectable from "./dialog/open.injectable";
import { ClusterRoleBindingDialog } from "./dialog/view";
import clusterRoleBindingStoreInjectable from "./store.injectable";

import type { ClusterRoleStore } from "../cluster-roles/store";
import type { ServiceAccountStore } from "../service-accounts/store";
import type { OpenClusterRoleBindingDialog } from "./dialog/open.injectable";
import type { ClusterRoleBindingStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  clusterRole = "cluster-role",
  types = "types",
  bindings = "bindings",
  age = "age",
}

interface Dependencies {
  clusterRoleBindingStore: ClusterRoleBindingStore;
  clusterRoleStore: ClusterRoleStore;
  serviceAccountStore: ServiceAccountStore;
  openClusterRoleBindingDialog: OpenClusterRoleBindingDialog;
}

@observer
class NonInjectedClusterRoleBindings extends React.Component<Dependencies> {
  render() {
    const { clusterRoleBindingStore, clusterRoleStore, serviceAccountStore, openClusterRoleBindingDialog } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_cluster_role_bindings"
          className="ClusterRoleBindings"
          store={clusterRoleBindingStore}
          dependentStores={[clusterRoleStore, serviceAccountStore]}
          sortingCallbacks={{
            [columnId.name]: (binding) => binding.getName(),
            [columnId.clusterRole]: (binding) => binding.roleRef.name,
            [columnId.types]: (binding) => binding.getSubjectTypes(),
            [columnId.bindings]: (binding) => binding.getSubjectNames(),
            [columnId.age]: (binding) => -binding.getCreationTimestamp(),
          }}
          searchFilters={[(binding) => binding.getSearchFields(), (binding) => binding.getSubjectNames()]}
          renderHeaderTitle="Cluster Role Bindings"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            {
              title: "Cluster Role",
              className: "cluster-role",
              sortBy: columnId.clusterRole,
              id: columnId.clusterRole,
            },
            { title: "Types", className: "types", sortBy: columnId.types, id: columnId.types },
            { title: "Bindings", className: "bindings", sortBy: columnId.bindings, id: columnId.bindings },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(binding) => [
            <WithTooltip>{binding.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={binding} />,
            <LinkToClusterRole name={binding.roleRef.name} />,
            <WithTooltip>{binding.getSubjectTypes()}</WithTooltip>,
            <WithTooltip>{binding.getSubjectNames()}</WithTooltip>,
            <KubeObjectAge key="age" object={binding} />,
          ]}
          addRemoveButtons={{
            onAdd: () => openClusterRoleBindingDialog(),
            addTooltip: "Create new ClusterRoleBinding",
          }}
        />
        <ClusterRoleBindingDialog />
      </SiblingsInTabLayout>
    );
  }
}

export const ClusterRoleBindings = withInjectables<Dependencies>(NonInjectedClusterRoleBindings, {
  getProps: (di, props) => ({
    ...props,
    clusterRoleBindingStore: di.inject(clusterRoleBindingStoreInjectable),
    clusterRoleStore: di.inject(clusterRoleStoreInjectable),
    serviceAccountStore: di.inject(serviceAccountStoreInjectable),
    openClusterRoleBindingDialog: di.inject(openClusterRoleBindingDialogInjectable),
  }),
});
