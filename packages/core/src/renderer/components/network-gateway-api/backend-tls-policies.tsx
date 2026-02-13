/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./backend-tls-policies.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import backendTLSPolicyStoreInjectable from "./backend-tls-policy-store.injectable";

import type { BackendTLSPolicy } from "@freelensapp/kube-object";

import type { BackendTLSPolicyStore } from "./backend-tls-policy-store";

interface Dependencies {
  backendTLSPolicyStore: BackendTLSPolicyStore;
}

const formatTargetRefs = (refs: BackendTLSPolicy["spec"]["targetRefs"]) => {
  if (!refs || refs.length === 0) {
    return "-";
  }

  return refs.map((ref) => `${ref.kind}/${ref.name}${ref.namespace ? ` (${ref.namespace})` : ""}`).join(", ");
};

const NonInjectedBackendTLSPolicies = observer((props: Dependencies) => {
  const { backendTLSPolicyStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_backend_tls_policies"
        className="BackendTLSPolicies"
        store={backendTLSPolicyStore}
        sortingCallbacks={{
          name: (item: BackendTLSPolicy) => item.getName(),
          namespace: (item: BackendTLSPolicy) => item.getNs(),
          age: (item: BackendTLSPolicy) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item: BackendTLSPolicy) => item.getSearchFields()]}
        renderHeaderTitle="Backend TLS Policies"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: "name", id: "name" },
          { title: "Namespace", className: "namespace", sortBy: "namespace", id: "namespace" },
          { title: "Target Refs", className: "targets", id: "targets" },
          { title: "Hostname", className: "hostname", id: "hostname" },
          { title: "Accepted", className: "accepted", id: "accepted" },
          { title: "Age", className: "age", sortBy: "age", id: "age" },
        ]}
        renderTableContents={(item: BackendTLSPolicy) => {
          const targetRefs = formatTargetRefs(item.getTargetRefs());
          const hostname = item.getHostname() ?? "-";

          return [
            <WithTooltip key="name">{item.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
            targetRefs === "-" ? (
              "-"
            ) : (
              <WithTooltip key="targets" tooltip={targetRefs}>
                {targetRefs}
              </WithTooltip>
            ),
            hostname === "-" ? (
              "-"
            ) : (
              <WithTooltip key="hostname" tooltip={hostname}>
                {hostname}
              </WithTooltip>
            ),
            <KubeObjectStatusIcon key="accepted" object={item} />,
            <KubeObjectAge key="age" object={item} />,
          ];
        }}
      />
    </SiblingsInTabLayout>
  );
});

export const BackendTLSPolicies = withInjectables<Dependencies>(NonInjectedBackendTLSPolicies, {
  getProps: (di, props) => ({
    ...props,
    backendTLSPolicyStore: di.inject(backendTLSPolicyStoreInjectable),
  }),
});
