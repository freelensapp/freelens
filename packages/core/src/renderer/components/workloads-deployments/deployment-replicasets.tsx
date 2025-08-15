/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./deployment-replicasets.scss";

import { Spinner } from "@freelensapp/spinner";
import { prevDefault, stopPropagation } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { DrawerTitle } from "../drawer";
import showDetailsInjectable from "../kube-detail-params/show-details.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectMenu } from "../kube-object-menu";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { Table, TableCell, TableHead, TableRow } from "../table";
import { WithTooltip } from "../with-tooltip";
import replicaSetStoreInjectable from "../workloads-replicasets/store.injectable";

import type { ReplicaSet } from "@freelensapp/kube-object";

import type { ShowDetails } from "../kube-detail-params/show-details.injectable";
import type { ReplicaSetStore } from "../workloads-replicasets/store";

enum sortBy {
  name = "name",
  namespace = "namespace",
  pods = "pods",
  age = "age",
}

interface Dependencies {
  replicaSetStore: ReplicaSetStore;
  showDetails: ShowDetails;
}

export interface DeploymentReplicaSetsProps {
  replicaSets: ReplicaSet[];
}

interface Dependencies {
  replicaSetStore: ReplicaSetStore;
  showDetails: ShowDetails;
}

@observer
class NonInjectedDeploymentReplicaSets extends React.Component<DeploymentReplicaSetsProps & Dependencies> {
  getPodsLength(replicaSet: ReplicaSet) {
    return this.props.replicaSetStore.getChildPods(replicaSet).length;
  }

  render() {
    const { replicaSets, replicaSetStore, showDetails } = this.props;

    if (!replicaSets.length && !replicaSetStore.isLoaded)
      return (
        <div className="ReplicaSets">
          <Spinner center />
        </div>
      );
    if (!replicaSets.length) return null;

    return (
      <div className="ReplicaSets flex column">
        <DrawerTitle>Deploy Revisions</DrawerTitle>
        <Table
          selectable
          tableId="deployment_replica_sets_view"
          scrollable={false}
          sortable={{
            [sortBy.name]: (replicaSet: ReplicaSet) => replicaSet.getName(),
            [sortBy.namespace]: (replicaSet: ReplicaSet) => replicaSet.getNs(),
            [sortBy.age]: (replicaSet: ReplicaSet) => replicaSet.metadata.creationTimestamp,
            [sortBy.pods]: (replicaSet: ReplicaSet) => this.getPodsLength(replicaSet),
          }}
          sortByDefault={{ sortBy: sortBy.pods, orderBy: "desc" }}
          sortSyncWithUrl={false}
          className="box grow"
        >
          <TableHead flat sticky={false}>
            <TableCell className="name" sortBy={sortBy.name}>
              Name
            </TableCell>
            <TableCell className="warning" />
            <TableCell className="namespace" sortBy={sortBy.namespace}>
              Namespace
            </TableCell>
            <TableCell className="pods" sortBy={sortBy.pods}>
              Pods
            </TableCell>
            <TableCell className="age" sortBy={sortBy.age}>
              Age
            </TableCell>
            <TableCell className="actions" />
          </TableHead>
          {replicaSets.map((replica) => (
            <TableRow
              key={replica.getId()}
              sortItem={replica}
              nowrap
              onClick={prevDefault(() => showDetails(replica.selfLink, false))}
            >
              <TableCell className="name">
                <WithTooltip>{replica.getName()}</WithTooltip>
              </TableCell>
              <TableCell className="warning">
                <KubeObjectStatusIcon key="icon" object={replica} />
              </TableCell>
              <TableCell className="namespace">
                <WithTooltip>{replica.getNs()}</WithTooltip>
              </TableCell>
              <TableCell className="pods">{this.getPodsLength(replica)}</TableCell>
              <TableCell className="age">
                <KubeObjectAge key="age" object={replica} />
              </TableCell>
              <TableCell className="actions" onClick={stopPropagation}>
                <KubeObjectMenu object={replica} />
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </div>
    );
  }
}

export const DeploymentReplicaSets = withInjectables<Dependencies, DeploymentReplicaSetsProps>(
  NonInjectedDeploymentReplicaSets,
  {
    getProps: (di, props) => ({
      ...props,
      replicaSetStore: di.inject(replicaSetStoreInjectable),
      showDetails: di.inject(showDetailsInjectable),
    }),
  },
);
