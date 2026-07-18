/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../../kube-object/age";
import { KubeObjectListLayout } from "../../kube-object-list-layout";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../../namespaces/namespace-select-badge";
import { WithTooltip } from "../../with-tooltip";
import backendTlsPolicyStoreInjectable from "./backend-tls-policy-store.injectable";

import type { BackendTLSPolicy } from "@freelensapp/kube-object";

import type { BackendTLSPolicyStore } from "./backend-tls-policy-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  targets = "targets",
  hostname = "hostname",
  age = "age",
}

interface Dependencies {
  store: BackendTLSPolicyStore;
}

const NonInjectedBackendTLSPolicies = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_api_backend_tls_policies"
        className="BackendTLSPolicies"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: BackendTLSPolicy) => item.getName(),
          [columnId.namespace]: (item: BackendTLSPolicy) => item.getNs(),
          [columnId.hostname]: (item: BackendTLSPolicy) => item.getHostname(),
          [columnId.age]: (item: BackendTLSPolicy) => -item.getCreationTimestamp(),
        }}
        searchFilters={[
          (item: BackendTLSPolicy) => item.getSearchFields(),
          (item: BackendTLSPolicy) => item.getTargetNames().join(" "),
          (item: BackendTLSPolicy) => item.getHostname(),
        ]}
        renderHeaderTitle="BackendTLSPolicies"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Targets", className: "targets", id: columnId.targets },
          { title: "Hostname", className: "hostname", sortBy: columnId.hostname, id: columnId.hostname },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: BackendTLSPolicy) => [
          <WithTooltip key="name">{item.getName()}</WithTooltip>,
          <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
          <WithTooltip key="targets">{item.getTargetNames().join(", ") || "-"}</WithTooltip>,
          <WithTooltip key="hostname">{item.getHostname() || "-"}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const BackendTLSPolicies = withInjectables<Dependencies>(NonInjectedBackendTLSPolicies, {
  getProps: (di, props) => ({ ...props, store: di.inject(backendTlsPolicyStoreInjectable) }),
});
