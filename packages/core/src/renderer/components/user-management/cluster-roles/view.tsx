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
import { WithTooltip } from "../../with-tooltip";
import openAddClusterRoleDialogInjectable from "./add-dialog/open.injectable";
import { AddClusterRoleDialog } from "./add-dialog/view";
import clusterRoleStoreInjectable from "./store.injectable";

import type { OpenAddClusterRoleDialog } from "./add-dialog/open.injectable";
import type { ClusterRoleStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  age = "age",
}

interface Dependencies {
  clusterRoleStore: ClusterRoleStore;
  openAddClusterRoleDialog: OpenAddClusterRoleDialog;
}

@observer
class NonInjectedClusterRoles extends React.Component<Dependencies> {
  render() {
    const { openAddClusterRoleDialog, clusterRoleStore } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_cluster_roles"
          className="ClusterRoles"
          store={clusterRoleStore}
          sortingCallbacks={{
            [columnId.name]: (clusterRole) => clusterRole.getName(),
            [columnId.age]: (clusterRole) => -clusterRole.getCreationTimestamp(),
          }}
          searchFilters={[(clusterRole) => clusterRole.getSearchFields()]}
          renderHeaderTitle="Cluster Roles"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(clusterRole) => [
            <WithTooltip>{clusterRole.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={clusterRole} />,
            <KubeObjectAge key="age" object={clusterRole} />,
          ]}
          addRemoveButtons={{
            onAdd: () => openAddClusterRoleDialog(),
            addTooltip: "Create new ClusterRole",
          }}
        />
        <AddClusterRoleDialog />
      </SiblingsInTabLayout>
    );
  }
}

export const ClusterRoles = withInjectables<Dependencies>(NonInjectedClusterRoles, {
  getProps: (di, props) => ({
    ...props,
    clusterRoleStore: di.inject(clusterRoleStoreInjectable),
    openAddClusterRoleDialog: di.inject(openAddClusterRoleDialogInjectable),
  }),
});
