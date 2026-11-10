/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./validating-admission-policy-bindings.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import validatingAdmissionPolicyBindingStoreInjectable from "./validating-admission-policy-binding-store.injectable";

import type { ValidatingAdmissionPolicyBindingStore } from "./validating-admission-policy-binding-store";

enum columnId {
  name = "name",
  policy = "policy",
  actions = "actions",
  age = "age",
}

interface Dependencies {
  store: ValidatingAdmissionPolicyBindingStore;
}

const NonInjectedValidatingAdmissionPolicyBindings = observer((props: Dependencies) => {
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
        tableId="config_validating_admission_policy_bindings"
        className={"ValidatingAdmissionPolicyBindings"}
        store={props.store}
        sortingCallbacks={{
          [columnId.name]: (item) => item.getName(),
          [columnId.policy]: (item) => item.getPolicyName(),
          [columnId.actions]: (item) => item.getValidationActions().join(", "),
          [columnId.age]: (item) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item) => item.getSearchFields(), (item) => item.getLabels()]}
        renderHeaderTitle="Validating Admission Policy Bindings"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Policy", sortBy: columnId.policy, id: columnId.policy },
          { title: "Actions", sortBy: columnId.actions, id: columnId.actions },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item) => [
          <WithTooltip>{item.getName()}</WithTooltip>,
          <WithTooltip>{item.getPolicyName()}</WithTooltip>,
          item.getValidationActions().join(", "),
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const ValidatingAdmissionPolicyBindings = withInjectables<Dependencies>(
  NonInjectedValidatingAdmissionPolicyBindings,
  {
    getProps: (di, props) => ({
      ...props,
      store: di.inject(validatingAdmissionPolicyBindingStoreInjectable),
    }),
  },
);
