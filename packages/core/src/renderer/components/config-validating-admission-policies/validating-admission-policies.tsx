/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./validating-admission-policies.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import validatingAdmissionPolicyStoreInjectable from "./validating-admission-policy-store.injectable";

import type { ValidatingAdmissionPolicyStore } from "./validating-admission-policy-store";

enum columnId {
  name = "name",
  validations = "validations",
  age = "age",
}

interface Dependencies {
  store: ValidatingAdmissionPolicyStore;
}

const NonInjectedValidatingAdmissionPolicies = observer((props: Dependencies) => {
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
        tableId="config_validating_admission_policies"
        className={"ValidatingAdmissionPolicies"}
        store={props.store}
        sortingCallbacks={{
          [columnId.name]: (item) => item.getName(),
          [columnId.validations]: (item) => item.getValidations().length,
          [columnId.age]: (item) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item) => item.getSearchFields(), (item) => item.getLabels()]}
        renderHeaderTitle="Validating Admission Policies"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          {
            title: "Validations",
            sortBy: columnId.validations,
            id: columnId.validations,
          },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item) => [
          <WithTooltip>{item.getName()}</WithTooltip>,
          item.getValidations().length,
          <KubeObjectAge key="age" object={item} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const ValidatingAdmissionPolicies = withInjectables<Dependencies>(NonInjectedValidatingAdmissionPolicies, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(validatingAdmissionPolicyStoreInjectable),
  }),
});
