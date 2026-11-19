/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./mutating-admission-policy-bindings.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import mutatingAdmissionPolicyBindingStoreInjectable from "./mutating-admission-policy-binding-store.injectable";

import type { MutatingAdmissionPolicyBindingStore } from "./mutating-admission-policy-binding-store";

enum columnId {
  name = "name",
  policy = "policy",
  age = "age",
}

interface Dependencies {
  store: MutatingAdmissionPolicyBindingStore;
}

const NonInjectedMutatingAdmissionPolicyBindings = observer((props: Dependencies) => {
  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        customizeHeader={({ searchProps, ...rest }) => ({
          ...rest,
          searchProps: {
            ...searchProps,
            placeholder: "Search...",
          },
        })}
        tableId="config_mutating_admission_policy_bindings"
        className={"MutatingAdmissionPolicyBindings"}
        store={props.store}
        sortingCallbacks={{
          [columnId.name]: (item) => item.getName(),
          [columnId.policy]: (item) => item.getPolicyName(),
          [columnId.age]: (item) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item) => item.getSearchFields(), (item) => item.getLabels()]}
        renderHeaderTitle="Mutating Admission Policy Bindings"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Policy", sortBy: columnId.policy, id: columnId.policy },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item) => [
          <WithTooltip>{item.getName()}</WithTooltip>,
          <WithTooltip>{item.getPolicyName()}</WithTooltip>,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const MutatingAdmissionPolicyBindings = withInjectables<Dependencies>(
  NonInjectedMutatingAdmissionPolicyBindings,
  {
    getProps: (di, props) => ({
      ...props,
      store: di.inject(mutatingAdmissionPolicyBindingStoreInjectable),
    }),
  },
);
