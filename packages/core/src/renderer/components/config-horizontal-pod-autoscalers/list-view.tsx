/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./list-view.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectConditionsList } from "../kube-object-conditions";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import getHorizontalPodAutoscalerMetrics from "./get-metrics.injectable";
import horizontalPodAutoscalerStoreInjectable from "./store.injectable";

import type { HorizontalPodAutoscaler } from "@freelensapp/kube-object";

import type { HorizontalPodAutoscalerStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  metrics = "metrics",
  minPods = "min-pods",
  maxPods = "max-pods",
  replicas = "replicas",
  age = "age",
  conditions = "conditions",
}

interface Dependencies {
  horizontalPodAutoscalerStore: HorizontalPodAutoscalerStore;
  getMetrics: (hpa: HorizontalPodAutoscaler) => string[];
}

@observer
class NonInjectedHorizontalPodAutoscalers extends React.Component<Dependencies> {
  getTargets(hpa: HorizontalPodAutoscaler) {
    const metrics = hpa.getMetrics();

    if (metrics.length === 0 && !hpa.spec?.targetCPUUtilizationPercentage) {
      return <p>--</p>;
    }

    const metricsRemain = metrics.length > 1 ? `+${metrics.length - 1} more...` : "";

    return (
      <p>
        {this.props.getMetrics(hpa)[0]} {metricsRemain}
      </p>
    );
  }

  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_hpa"
          className="HorizontalPodAutoscalers"
          store={this.props.horizontalPodAutoscalerStore}
          sortingCallbacks={{
            [columnId.name]: (hpa) => hpa.getName(),
            [columnId.namespace]: (hpa) => hpa.getNs(),
            [columnId.minPods]: (hpa) => hpa.getMinPods(),
            [columnId.maxPods]: (hpa) => hpa.getMaxPods(),
            [columnId.replicas]: (hpa) => hpa.getReplicas(),
            [columnId.age]: (hpa) => -hpa.getCreationTimestamp(),
          }}
          searchFilters={[(hpa) => hpa.getSearchFields()]}
          renderHeaderTitle="Horizontal Pod Autoscalers"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Metrics", className: "metrics", id: columnId.metrics },
            { title: "Min Pods", className: "min-pods", sortBy: columnId.minPods, id: columnId.minPods },
            { title: "Max Pods", className: "max-pods", sortBy: columnId.maxPods, id: columnId.maxPods },
            { title: "Replicas", className: "replicas", sortBy: columnId.replicas, id: columnId.replicas },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Conditions", className: "conditions scrollable", id: columnId.conditions },
          ]}
          renderTableContents={(hpa) => [
            <WithTooltip>{hpa.getName()}</WithTooltip>,
            <NamespaceSelectBadge key="namespace" namespace={hpa.getNs()} />,
            this.getTargets(hpa),
            hpa.getMinPods(),
            hpa.getMaxPods(),
            hpa.getReplicas(),
            <KubeObjectAge key="age" object={hpa} />,
            <KubeObjectConditionsList key="conditions" object={hpa} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const HorizontalPodAutoscalers = withInjectables<Dependencies>(NonInjectedHorizontalPodAutoscalers, {
  getProps: (di, props) => ({
    ...props,
    horizontalPodAutoscalerStore: di.inject(horizontalPodAutoscalerStoreInjectable),
    getMetrics: di.inject(getHorizontalPodAutoscalerMetrics),
  }),
});
