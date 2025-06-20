/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./deployments.scss";

import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import orderBy from "lodash/orderBy";
import { observer } from "mobx-react";
import React from "react";
import { WithTooltip } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import deploymentStoreInjectable from "./store.injectable";

import type { Deployment } from "@freelensapp/kube-object";

import type { EventStore } from "../events/store";
import type { DeploymentStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
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

@observer
class NonInjectedDeployments extends React.Component<Dependencies> {
  renderConditions(deployment: Deployment) {
    const conditions = orderBy(deployment.getConditions(true), "type", "asc");

    return conditions.map(({ type, message }) => (
      <span key={type} className={cssNames("condition", kebabCase(type))} title={message}>
        {type}
      </span>
    ));
  }

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
            [columnId.ready]: (deployment) => deployment.status?.readyReplicas || 0,
            [columnId.desired]: (deployment) => deployment.getReplicas(),
            [columnId.updated]: (deployment) => deployment.status?.updatedReplicas || 0,
            [columnId.available]: (deployment) => deployment.status?.availableReplicas || 0,
            [columnId.age]: (deployment) => -deployment.getCreationTimestamp(),
            [columnId.condition]: (deployment) => deployment.getConditionsText(),
          }}
          searchFilters={[(deployment) => deployment.getSearchFields(), (deployment) => deployment.getConditionsText()]}
          renderHeaderTitle="Deployments"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            {
              title: "Namespace",
              className: "namespace",
              sortBy: columnId.namespace,
              id: columnId.namespace,
            },
            { title: "Ready", className: "ready", sortBy: columnId.ready, id: columnId.ready },
            { title: "Desired", className: "desired", sortBy: columnId.desired, id: columnId.desired },
            { title: "Updated", className: "updated", sortBy: columnId.updated, id: columnId.updated },
            { title: "Available", className: "available", sortBy: columnId.available, id: columnId.available },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            {
              title: "Conditions",
              className: "conditions",
              sortBy: columnId.condition,
              id: columnId.condition,
            },
          ]}
          renderTableContents={(deployment) => [
            <WithTooltip>{deployment.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={deployment} />,
            <NamespaceSelectBadge key="namespace" namespace={deployment.getNs()} />,
            deployment.status?.readyReplicas || 0,
            deployment.getReplicas(),
            deployment.status?.updatedReplicas || 0,
            deployment.status?.availableReplicas || 0,
            <KubeObjectAge key="age" object={deployment} />,
            this.renderConditions(deployment),
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
