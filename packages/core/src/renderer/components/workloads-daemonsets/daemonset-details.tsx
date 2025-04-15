/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./daemonset-details.scss";

import { DaemonSet } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { PodDetailsAffinities } from "../workloads-pods/pod-details-affinities";
import { PodDetailsList } from "../workloads-pods/pod-details-list";
import { PodDetailsStatuses } from "../workloads-pods/pod-details-statuses";
import { PodDetailsTolerations } from "../workloads-pods/pod-details-tolerations";
import type { PodStore } from "../workloads-pods/store";
import podStoreInjectable from "../workloads-pods/store.injectable";
import type { DaemonSetStore } from "./store";
import daemonSetStoreInjectable from "./store.injectable";

export interface DaemonSetDetailsProps extends KubeObjectDetailsProps<DaemonSet> {}

interface Dependencies {
  subscribeStores: SubscribeStores;
  daemonSetStore: DaemonSetStore;
  podStore: PodStore;
  logger: Logger;
}

@observer
class NonInjectedDaemonSetDetails extends React.Component<DaemonSetDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.subscribeStores([this.props.podStore])]);
  }

  render() {
    const { object: daemonSet, daemonSetStore, logger } = this.props;

    if (!daemonSet) {
      return null;
    }

    if (!(daemonSet instanceof DaemonSet)) {
      logger.error("[DaemonSetDetails]: passed object that is not an instanceof DaemonSet", daemonSet);

      return null;
    }

    const { spec } = daemonSet;
    const selectors = daemonSet.getSelectors();
    const images = daemonSet.getImages();
    const nodeSelector = daemonSet.getNodeSelectors();
    const childPods = daemonSetStore.getChildPods(daemonSet);

    return (
      <div className="DaemonSetDetails">
        {selectors.length > 0 && (
          <DrawerItem name="Selector" labelsOnly>
            {selectors.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </DrawerItem>
        )}
        {nodeSelector.length > 0 && (
          <DrawerItem name="Node Selector" labelsOnly>
            {nodeSelector.map((label) => (
              <Badge key={label} label={label} />
            ))}
          </DrawerItem>
        )}
        {images.length > 0 && (
          <DrawerItem name="Images">
            {images.map((image) => (
              <p key={image}>{image}</p>
            ))}
          </DrawerItem>
        )}
        <DrawerItem name="Strategy Type">{spec.updateStrategy.type}</DrawerItem>
        <PodDetailsTolerations workload={daemonSet} />
        <PodDetailsAffinities workload={daemonSet} />
        <DrawerItem name="Pod Status" className="pod-status">
          <PodDetailsStatuses pods={childPods} />
        </DrawerItem>
        <PodDetailsList pods={childPods} owner={daemonSet} />
      </div>
    );
  }
}

export const DaemonSetDetails = withInjectables<Dependencies, DaemonSetDetailsProps>(NonInjectedDaemonSetDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    daemonSetStore: di.inject(daemonSetStoreInjectable),
    podStore: di.inject(podStoreInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
