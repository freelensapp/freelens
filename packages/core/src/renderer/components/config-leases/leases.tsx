/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./leases.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import * as React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import leaseStoreInjectable from "./store.injectable";

import type { Lease } from "@freelensapp/kube-object";

import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { LeaseStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  holder = "holder",
  age = "age",
}

export interface LeaseProps extends KubeObjectDetailsProps<Lease> {}

interface Dependencies {
  leaseStore: LeaseStore;
}

@observer
class NonInjectedLease extends React.Component<LeaseProps & Dependencies> {
  render() {
    const { leaseStore } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_leases"
          className="Leases"
          store={leaseStore}
          sortingCallbacks={{
            [columnId.name]: (lease) => lease.getName(),
            [columnId.namespace]: (lease) => lease.getNs(),
            [columnId.holder]: (lease) => lease.getHolderIdentity(),
            [columnId.age]: (lease) => -lease.getCreationTimestamp(),
          }}
          searchFilters={[(lease) => lease.getSearchFields()]}
          renderHeaderTitle="Leases"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Holder", className: "holder", sortBy: columnId.holder, id: columnId.holder },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(lease) => [
            <WithTooltip>{lease.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={lease.getNs()} />,
            <WithTooltip>{lease.getHolderIdentity()}</WithTooltip>,
            <KubeObjectAge key="age" object={lease} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const Leases = withInjectables<Dependencies, LeaseProps>(NonInjectedLease, {
  getProps: (di, props) => ({
    ...props,
    leaseStore: di.inject(leaseStoreInjectable),
  }),
});
