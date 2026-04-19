/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./backend-lb-policies.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import backendLBPolicyStoreInjectable from "./backend-lb-policy-store.injectable";

import type { BackendLBPolicy } from "@freelensapp/kube-object";

import type { BackendLBPolicyStore } from "./backend-lb-policy-store";

interface Dependencies {
  backendLBPolicyStore: BackendLBPolicyStore;
}

const formatTargetRefs = (refs: BackendLBPolicy["spec"]["targetRef"][]) => {
  if (!refs || refs.length === 0) {
    return "-";
  }

  return refs.map((ref) => `${ref.kind}/${ref.name}${ref.namespace ? ` (${ref.namespace})` : ""}`).join(", ");
};

const NonInjectedBackendLBPolicies = observer((props: Dependencies) => {
  const { backendLBPolicyStore } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_backend_lb_policies"
        className="BackendLBPolicies"
        store={backendLBPolicyStore}
        sortingCallbacks={{
          name: (item: BackendLBPolicy) => item.getName(),
          namespace: (item: BackendLBPolicy) => item.getNs(),
          age: (item: BackendLBPolicy) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item: BackendLBPolicy) => item.getSearchFields()]}
        renderHeaderTitle="Backend LB Policies"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: "name", id: "name" },
          { title: "Namespace", className: "namespace", sortBy: "namespace", id: "namespace" },
          { title: "Target Ref", className: "targets", id: "targets" },
          { title: "Policy Type", className: "policyType", id: "policyType" },
          { title: "Accepted", className: "accepted", id: "accepted" },
          { title: "Age", className: "age", sortBy: "age", id: "age" },
        ]}
        renderTableContents={(item: BackendLBPolicy) => {
          const targetRefs = formatTargetRefs(item.getTargetRefs());
          const policyType = item.getPolicyType() || "-";

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
            policyType === "-" ? (
              "-"
            ) : (
              <WithTooltip key="policyType" tooltip={policyType}>
                {policyType}
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

export const BackendLBPolicies = withInjectables<Dependencies>(NonInjectedBackendLBPolicies, {
  getProps: (di, props) => ({
    ...props,
    backendLBPolicyStore: di.inject(backendLBPolicyStoreInjectable),
  }),
});
