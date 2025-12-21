/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./resource-quotas.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import openAddQuotaDialogInjectable from "./add-dialog/open.injectable";
import { AddQuotaDialog } from "./add-dialog/view";
import resourceQuotaStoreInjectable from "./store.injectable";

import type { ResourceQuotaStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  age = "age",
}

interface Dependencies {
  resourceQuotaStore: ResourceQuotaStore;
  openAddQuotaDialog: () => void;
}

@observer
class NonInjectedResourceQuotas extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_quotas"
          className="ResourceQuotas"
          store={this.props.resourceQuotaStore}
          sortingCallbacks={{
            [columnId.name]: (resourceQuota) => resourceQuota.getName(),
            [columnId.namespace]: (resourceQuota) => resourceQuota.getNs(),
            [columnId.age]: (resourceQuota) => -resourceQuota.getCreationTimestamp(),
          }}
          searchFilters={[
            (resourceQuota) => resourceQuota.getSearchFields(),
            (resourceQuota) => resourceQuota.getName(),
          ]}
          renderHeaderTitle="Resource Quotas"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(resourceQuota) => [
            <WithTooltip>{resourceQuota.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={resourceQuota.getNs()} />,
            <KubeObjectAge key="age" object={resourceQuota} />,
          ]}
          addRemoveButtons={{
            onAdd: this.props.openAddQuotaDialog,
            addTooltip: "Create new ResourceQuota",
          }}
        />
        <AddQuotaDialog />
      </SiblingsInTabLayout>
    );
  }
}

export const ResourceQuotas = withInjectables<Dependencies>(NonInjectedResourceQuotas, {
  getProps: (di, props) => ({
    ...props,
    resourceQuotaStore: di.inject(resourceQuotaStoreInjectable),
    openAddQuotaDialog: di.inject(openAddQuotaDialogInjectable),
  }),
});
