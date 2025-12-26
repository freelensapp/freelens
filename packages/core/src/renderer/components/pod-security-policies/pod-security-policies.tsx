/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-security-policies.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import podSecurityPolicyStoreInjectable from "./store.injectable";

import type { PodSecurityPolicyStore } from "./store";

enum columnId {
  name = "name",
  volumes = "volumes",
  privileged = "privileged",
  age = "age",
}

interface Dependencies {
  podSecurityPolicyStore: PodSecurityPolicyStore;
}

@observer
class NonInjectedPodSecurityPolicies extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="access_pod_security_policies"
          className="PodSecurityPolicies"
          store={this.props.podSecurityPolicyStore}
          sortingCallbacks={{
            [columnId.name]: (podSecurityPolicy) => podSecurityPolicy.getName(),
            [columnId.volumes]: (podSecurityPolicy) => podSecurityPolicy.getVolumes(),
            [columnId.privileged]: (podSecurityPolicy) => +podSecurityPolicy.isPrivileged(),
            [columnId.age]: (podSecurityPolicy) => -podSecurityPolicy.getCreationTimestamp(),
          }}
          searchFilters={[
            (podSecurityPolicy) => podSecurityPolicy.getSearchFields(),
            (podSecurityPolicy) => podSecurityPolicy.getVolumes(),
            (podSecurityPolicy) => Object.values(podSecurityPolicy.getRules()),
          ]}
          renderHeaderTitle="Pod Security Policies"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Privileged", className: "privileged", sortBy: columnId.privileged, id: columnId.privileged },
            { title: "Volumes", className: "volumes", sortBy: columnId.volumes, id: columnId.volumes },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(podSecurityPolicy) => [
            podSecurityPolicy.getName(),
            podSecurityPolicy.isPrivileged() ? "Yes" : "No",
            podSecurityPolicy.getVolumes().join(", "),
            <KubeObjectAge key="age" object={podSecurityPolicy} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const PodSecurityPolicies = withInjectables<Dependencies>(NonInjectedPodSecurityPolicies, {
  getProps: (di, props) => ({
    ...props,
    podSecurityPolicyStore: di.inject(podSecurityPolicyStoreInjectable),
  }),
});
