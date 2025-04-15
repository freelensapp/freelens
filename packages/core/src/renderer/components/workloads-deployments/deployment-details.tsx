/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./deployment-details.scss";

import { Deployment } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { PodDetailsAffinities } from "../workloads-pods/pod-details-affinities";
import { PodDetailsList } from "../workloads-pods/pod-details-list";
import { PodDetailsTolerations } from "../workloads-pods/pod-details-tolerations";
import type { ReplicaSetStore } from "../workloads-replicasets/store";
import replicaSetStoreInjectable from "../workloads-replicasets/store.injectable";
import { DeploymentReplicaSets } from "./deployment-replicasets";
import type { DeploymentStore } from "./store";
import deploymentStoreInjectable from "./store.injectable";

export interface DeploymentDetailsProps extends KubeObjectDetailsProps<Deployment> {}

interface Dependencies {
  subscribeStores: SubscribeStores;
  replicaSetStore: ReplicaSetStore;
  deploymentStore: DeploymentStore;
  logger: Logger;
}

@observer
class NonInjectedDeploymentDetails extends React.Component<DeploymentDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.subscribeStores([this.props.replicaSetStore])]);
  }

  render() {
    const { object: deployment, replicaSetStore, deploymentStore, logger } = this.props;

    if (!deployment) {
      return null;
    }

    if (!(deployment instanceof Deployment)) {
      logger.error("[DeploymentDetails]: passed object that is not an instanceof Deployment", deployment);

      return null;
    }

    const { status, spec } = deployment;
    const nodeSelector = deployment.getNodeSelectors();
    const selectors = deployment.getSelectors();
    const childPods = deploymentStore.getChildPods(deployment);
    const replicaSets = replicaSetStore.getReplicaSetsByOwner(deployment);

    return (
      <div className="DeploymentDetails">
        <DrawerItem name="Replicas">
          {`${spec.replicas} desired, ${status?.updatedReplicas ?? 0} updated, `}
          {`${status?.replicas ?? 0} total, ${status?.availableReplicas ?? 0} available, `}
          {`${status?.unavailableReplicas ?? 0} unavailable`}
        </DrawerItem>
        {selectors.length > 0 && (
          <DrawerItem name="Selector" labelsOnly>
            {selectors.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </DrawerItem>
        )}
        {nodeSelector.length > 0 && (
          <DrawerItem name="Node Selector">
            {nodeSelector.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </DrawerItem>
        )}
        <DrawerItem name="Strategy Type">{spec.strategy.type}</DrawerItem>
        <DrawerItem name="Conditions" className="conditions" labelsOnly>
          {deployment.getConditions().map(({ type, message, lastTransitionTime, status }) => (
            <Badge
              key={type}
              label={type}
              disabled={status === "False"}
              className={kebabCase(type)}
              tooltip={
                <>
                  <p>{message}</p>
                  <p>{`Last transition time: ${lastTransitionTime}`}</p>
                </>
              }
            />
          ))}
        </DrawerItem>
        <PodDetailsTolerations workload={deployment} />
        <PodDetailsAffinities workload={deployment} />
        <DeploymentReplicaSets replicaSets={replicaSets} />
        <PodDetailsList pods={childPods} owner={deployment} />
      </div>
    );
  }
}

export const DeploymentDetails = withInjectables<Dependencies, DeploymentDetailsProps>(NonInjectedDeploymentDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    replicaSetStore: di.inject(replicaSetStoreInjectable),
    deploymentStore: di.inject(deploymentStoreInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
