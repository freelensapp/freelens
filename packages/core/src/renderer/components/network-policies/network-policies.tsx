/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./network-policies.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import networkPolicyStoreInjectable from "./store.injectable";

import type { NetworkPolicyStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  types = "types",
  age = "age",
}

interface Dependencies {
  networkPolicyStore: NetworkPolicyStore;
}

@observer
class NonInjectedNetworkPolicies extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="network_policies"
          className="NetworkPolicies"
          store={this.props.networkPolicyStore}
          sortingCallbacks={{
            [columnId.name]: (networkPolicy) => networkPolicy.getName(),
            [columnId.namespace]: (networkPolicy) => networkPolicy.getNs(),
            [columnId.age]: (networkPolicy) => -networkPolicy.getCreationTimestamp(),
          }}
          searchFilters={[(networkPolicy) => networkPolicy.getSearchFields()]}
          renderHeaderTitle="Network Policies"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Policy Types", className: "type", id: columnId.types },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(networkPolicy) => [
            <WithTooltip>{networkPolicy.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={networkPolicy.getNs()} />,
            <WithTooltip>{networkPolicy.getTypes().join(", ")}</WithTooltip>,
            <KubeObjectAge key="age" object={networkPolicy} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const NetworkPolicies = withInjectables<Dependencies>(NonInjectedNetworkPolicies, {
  getProps: (di, props) => ({
    ...props,
    networkPolicyStore: di.inject(networkPolicyStoreInjectable),
  }),
});
