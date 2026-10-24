/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./mutating-admission-policies.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import mutatingAdmissionPolicyStoreInjectable from "./mutating-admission-policy-store.injectable";

import type { MutatingAdmissionPolicyStore } from "./mutating-admission-policy-store";

enum columnId {
  name = "name",
  mutations = "mutations",
  age = "age",
}

interface Dependencies {
  store: MutatingAdmissionPolicyStore;
}

const NonInjectedMutatingAdmissionPolicies = observer((props: Dependencies) => {
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
        tableId="config_mutating_admission_policies"
        className={"MutatingAdmissionPolicies"}
        store={props.store}
        sortingCallbacks={{
          [columnId.name]: (item) => item.getName(),
          [columnId.mutations]: (item) => item.getMutations().length,
          [columnId.age]: (item) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item) => item.getSearchFields(), (item) => item.getLabels()]}
        renderHeaderTitle="Mutating Admission Policies"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          {
            title: "Mutations",
            sortBy: columnId.mutations,
            id: columnId.mutations,
          },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item) => [
          <WithTooltip>{item.getName()}</WithTooltip>,
          item.getMutations().length,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const MutatingAdmissionPolicies = withInjectables<Dependencies>(NonInjectedMutatingAdmissionPolicies, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(mutatingAdmissionPolicyStoreInjectable),
  }),
});
