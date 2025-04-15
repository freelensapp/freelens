/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-disruption-budgets.scss";

import type { PodDisruptionBudget } from "@freelensapp/kube-object";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import * as React from "react";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { KubeObjectAge } from "../kube-object/age";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import type { PodDisruptionBudgetStore } from "./store";
import podDisruptionBudgetStoreInjectable from "./store.injectable";

enum columnId {
  name = "name",
  namespace = "namespace",
  minAvailable = "min-available",
  maxUnavailable = "max-unavailable",
  currentHealthy = "current-healthy",
  desiredHealthy = "desired-healthy",
  age = "age",
}

export interface PodDisruptionBudgetsProps extends KubeObjectDetailsProps<PodDisruptionBudget> {}

interface Dependencies {
  podDisruptionBudgetStore: PodDisruptionBudgetStore;
}

@observer
class NonInjectedPodDisruptionBudgets extends React.Component<PodDisruptionBudgetsProps & Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="configuration_distribution_budgets"
          className="PodDisruptionBudgets"
          store={this.props.podDisruptionBudgetStore}
          sortingCallbacks={{
            [columnId.name]: (pdb) => pdb.getName(),
            [columnId.namespace]: (pdb) => pdb.getNs(),
            [columnId.minAvailable]: (pdb) => pdb.getMinAvailable(),
            [columnId.maxUnavailable]: (pdb) => pdb.getMaxUnavailable(),
            [columnId.currentHealthy]: (pdb) => pdb.getCurrentHealthy(),
            [columnId.desiredHealthy]: (pdb) => pdb.getDesiredHealthy(),
            [columnId.age]: (pdb) => -pdb.getCreationTimestamp(),
          }}
          searchFilters={[(pdb) => pdb.getSearchFields()]}
          renderHeaderTitle="Pod Disruption Budgets"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            {
              title: "Min Available",
              className: "min-available",
              sortBy: columnId.minAvailable,
              id: columnId.minAvailable,
            },
            {
              title: "Max Unavailable",
              className: "max-unavailable",
              sortBy: columnId.maxUnavailable,
              id: columnId.maxUnavailable,
            },
            {
              title: "Current Healthy",
              className: "current-healthy",
              sortBy: columnId.currentHealthy,
              id: columnId.currentHealthy,
            },
            {
              title: "Desired Healthy",
              className: "desired-healthy",
              sortBy: columnId.desiredHealthy,
              id: columnId.desiredHealthy,
            },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(pdb) => [
            pdb.getName(),
            <KubeObjectStatusIcon key="icon" object={pdb} />,
            <NamespaceSelectBadge key="namespace" namespace={pdb.getNs()} />,
            pdb.getMinAvailable(),
            pdb.getMaxUnavailable(),
            pdb.getCurrentHealthy(),
            pdb.getDesiredHealthy(),
            <KubeObjectAge key="age" object={pdb} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const PodDisruptionBudgets = withInjectables<Dependencies, PodDisruptionBudgetsProps>(
  NonInjectedPodDisruptionBudgets,
  {
    getProps: (di, props) => ({
      ...props,
      podDisruptionBudgetStore: di.inject(podDisruptionBudgetStoreInjectable),
    }),
  },
);
