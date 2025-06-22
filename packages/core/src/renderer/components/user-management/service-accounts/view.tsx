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
import openCreateServiceAccountDialogInjectable from "./create-dialog/open.injectable";
import { CreateServiceAccountDialog } from "./create-dialog/view";
import serviceAccountStoreInjectable from "./store.injectable";

import type { OpenCreateServiceAccountDialog } from "./create-dialog/open.injectable";
import type { ServiceAccountStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  age = "age",
}

interface Dependencies {
  serviceAccountStore: ServiceAccountStore;
  openCreateServiceAccountDialog: OpenCreateServiceAccountDialog;
}

@observer
class NonInjectedServiceAccounts extends React.Component<Dependencies> {
  render() {
    const { serviceAccountStore, openCreateServiceAccountDialog } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_service_accounts"
          className="ServiceAccounts"
          store={serviceAccountStore}
          sortingCallbacks={{
            [columnId.name]: (account) => account.getName(),
            [columnId.namespace]: (account) => account.getNs(),
            [columnId.age]: (account) => -account.getCreationTimestamp(),
          }}
          searchFilters={[(account) => account.getSearchFields()]}
          renderHeaderTitle="Service Accounts"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(account) => [
            <WithTooltip>{account.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={account} />,
            <NamespaceSelectBadge key="namespace" namespace={account.getNs()} />,
            <KubeObjectAge key="age" object={account} />,
          ]}
          addRemoveButtons={{
            onAdd: () => openCreateServiceAccountDialog(),
            addTooltip: "Create new Service Account",
          }}
        />
        <CreateServiceAccountDialog />
      </SiblingsInTabLayout>
    );
  }
}

export const ServiceAccounts = withInjectables<Dependencies>(NonInjectedServiceAccounts, {
  getProps: (di, props) => ({
    ...props,
    serviceAccountStore: di.inject(serviceAccountStoreInjectable),
    openCreateServiceAccountDialog: di.inject(openCreateServiceAccountDialogInjectable),
  }),
});
