/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./deployments.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectConditionsList } from "../kube-object-conditions";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import deploymentStoreInjectable from "./store.injectable";

import type { Deployment } from "@freelensapp/kube-object";

import type { EventStore } from "../events/store";
import type { DeploymentStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  replicas = "replicas",
  ready = "ready",
  desired = "desired",
  updated = "updated",
  available = "available",
  age = "age",
  condition = "condition",
}

interface Dependencies {
  deploymentStore: DeploymentStore;
  eventStore: EventStore;
}

function getReplicas(deployment: Deployment) {
  const replicas = deployment.status?.replicas || 0;
  const availableReplicas = deployment.status?.availableReplicas || 0;
  return `${availableReplicas}/${replicas}`;
}

@observer
class NonInjectedDeployments extends React.Component<Dependencies> {
  render() {
    const { deploymentStore, eventStore } = this.props;

    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="workload_deployments"
          className="Deployments"
          store={deploymentStore}
          dependentStores={[eventStore]} // status icon component uses event store
          sortingCallbacks={{
            [columnId.name]: (deployment) => deployment.getName(),
            [columnId.namespace]: (deployment) => deployment.getNs(),
            [columnId.replicas]: (deployment) =>
              (deployment.status?.availableReplicas || 0) * 1000000 + (deployment.status?.replicas || 0),
            [columnId.ready]: (deployment) => deployment.status?.readyReplicas || 0,
            [columnId.desired]: (deployment) => deployment.getReplicas(),
            [columnId.updated]: (deployment) => deployment.status?.updatedReplicas || 0,
            [columnId.available]: (deployment) => deployment.status?.availableReplicas || 0,
            [columnId.age]: (deployment) => -deployment.getCreationTimestamp(),
            [columnId.condition]: (deployment) => deployment.getConditionsText(),
          }}
          searchFilters={[(deployment) => deployment.getSearchFields(), (deployment) => deployment.getConditionsText()]}
          renderHeaderTitle="Deployments"
          defaultHiddenTableColumns={[columnId.replicas]}
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            {
              title: "Namespace",
              className: "namespace",
              sortBy: columnId.namespace,
              id: columnId.namespace,
            },
            { title: "Replicas", className: "replicas", sortBy: columnId.replicas, id: columnId.replicas },
            { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
            { title: "Desired", className: "desired", sortBy: columnId.desired, id: columnId.desired },
            { title: "Updated", className: "updated", sortBy: columnId.updated, id: columnId.updated },
            { title: "Available", className: "available", sortBy: columnId.available, id: columnId.available },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            {
              title: "Conditions",
              className: "conditions scrollable",
              sortBy: columnId.condition,
              id: columnId.condition,
            },
          ]}
          renderTableContents={(deployment) => [
            <WithTooltip>{deployment.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={deployment} />,
            <NamespaceSelectBadge key="namespace" namespace={deployment.getNs()} />,
            getReplicas(deployment),
            deployment.status?.readyReplicas || 0,
            deployment.getReplicas(),
            deployment.status?.updatedReplicas || 0,
            deployment.status?.availableReplicas || 0,
            <KubeObjectAge key="age" object={deployment} />,
            <KubeObjectConditionsList key="conditions" object={deployment} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const Deployments = withInjectables<Dependencies>(NonInjectedDeployments, {
  getProps: (di, props) => ({
    ...props,
    deploymentStore: di.inject(deploymentStoreInjectable),
    eventStore: di.inject(eventStoreInjectable),
  }),
});
