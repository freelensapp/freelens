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
import { KubeObjectListLayout } from "../../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../../kube-object-status-icon";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../../namespaces/namespace-select-badge";
import { WithTooltip } from "../../with-tooltip";
import clusterRoleStoreInjectable from "../cluster-roles/store.injectable";
import roleStoreInjectable from "../roles/store.injectable";
import serviceAccountStoreInjectable from "../service-accounts/store.injectable";
import openRoleBindingDialogInjectable from "./dialog/open.injectable";
import { RoleBindingDialog } from "./dialog/view";
import roleBindingStoreInjectable from "./store.injectable";

import type { ClusterRoleStore } from "../cluster-roles/store";
import type { RoleStore } from "../roles/store";
import type { ServiceAccountStore } from "../service-accounts/store";
import type { OpenRoleBindingDialog } from "./dialog/open.injectable";
import type { RoleBindingStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  role = "role",
  types = "types",
  bindings = "bindings",
  age = "age",
}

interface Dependencies {
  roleBindingStore: RoleBindingStore;
  roleStore: RoleStore;
  clusterRoleStore: ClusterRoleStore;
  serviceAccountStore: ServiceAccountStore;
  openRoleBindingDialog: OpenRoleBindingDialog;
}

@observer
class NonInjectedRoleBindings extends React.Component<Dependencies> {
  render() {
    const { clusterRoleStore, roleBindingStore, roleStore, serviceAccountStore, openRoleBindingDialog } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_role_bindings"
          className="RoleBindings"
          store={roleBindingStore}
          dependentStores={[roleStore, clusterRoleStore, serviceAccountStore]}
          sortingCallbacks={{
            [columnId.name]: (binding) => binding.getName(),
            [columnId.namespace]: (binding) => binding.getNs(),
            [columnId.role]: (binding) => binding.roleRef.name,
            [columnId.types]: (binding) => binding.getSubjectTypes(),
            [columnId.bindings]: (binding) => binding.getSubjectNames(),
            [columnId.age]: (binding) => -binding.getCreationTimestamp(),
          }}
          searchFilters={[(binding) => binding.getSearchFields(), (binding) => binding.getSubjectNames()]}
          renderHeaderTitle="Role Bindings"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Role", className: "role", sortBy: columnId.role, id: columnId.role },
            { title: "Types", className: "types", sortBy: columnId.types, id: columnId.types },
            { title: "Bindings", className: "bindings", sortBy: columnId.bindings, id: columnId.bindings },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(binding) => [
            <WithTooltip>{binding.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={binding} />,
            <NamespaceSelectBadge key="namespace" namespace={binding.getNs()} />,
            <WithTooltip>{binding.roleRef.name}</WithTooltip>,
            <WithTooltip>{binding.getSubjectTypes()}</WithTooltip>,
            <WithTooltip>{binding.getSubjectNames()}</WithTooltip>,
            <KubeObjectAge key="age" object={binding} />,
          ]}
          addRemoveButtons={{
            onAdd: () => openRoleBindingDialog(),
            addTooltip: "Create new RoleBinding",
          }}
        />
        <RoleBindingDialog />
      </SiblingsInTabLayout>
    );
  }
}

export const RoleBindings = withInjectables<Dependencies>(NonInjectedRoleBindings, {
  getProps: (di, props) => ({
    ...props,
    clusterRoleStore: di.inject(clusterRoleStoreInjectable),
    roleBindingStore: di.inject(roleBindingStoreInjectable),
    roleStore: di.inject(roleStoreInjectable),
    serviceAccountStore: di.inject(serviceAccountStoreInjectable),
    openRoleBindingDialog: di.inject(openRoleBindingDialogInjectable),
  }),
});
