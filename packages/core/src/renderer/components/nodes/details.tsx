/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./details.scss";

import { formatNodeTaint, Node } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import { DrawerTitle } from "../drawer/drawer-title";
import { KubeObjectConditionsDrawer } from "../kube-object-conditions";
import loadPodsFromAllNamespacesInjectable from "../workloads-pods/load-pods-from-all-namespaces.injectable";
import { PodDetailsList } from "../workloads-pods/pod-details-list";
import podStoreInjectable from "../workloads-pods/store.injectable";
import { NodeDetailsResources } from "./details-resources";

import type { Logger } from "@freelensapp/logger";

import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { PodStore } from "../workloads-pods/store";

export interface NodeDetailsProps extends KubeObjectDetailsProps<Node> {}

interface Dependencies {
  subscribeStores: SubscribeStores;
  podStore: PodStore;
  logger: Logger;
  loadPodsFromAllNamespaces: () => void;
}

@observer
class NonInjectedNodeDetails extends React.Component<NodeDetailsProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.subscribeStores([this.props.podStore])]);

    this.props.loadPodsFromAllNamespaces();
  }

  render() {
    const { object: node, podStore, logger } = this.props;

    if (!node) {
      return null;
    }

    if (!(node instanceof Node)) {
      logger.error("[NodeDetails]: passed object that is not an instanceof Node", node);

      return null;
    }

    const { nodeInfo, addresses } = node.status ?? {};
    const taints = node.getTaints();
    const childPods = podStore.getPodsByNode(node.getName());

    return (
      <div className="NodeDetails">
        {addresses && (
          <DrawerItem name="Addresses">
            {addresses.map(({ type, address }) => (
              <p key={type}>{`${type}: ${address}`}</p>
            ))}
          </DrawerItem>
        )}
        {nodeInfo && (
          <>
            <DrawerItem name="OS">{`${nodeInfo.operatingSystem} (${nodeInfo.architecture})`}</DrawerItem>
            <DrawerItem name="OS Image">{nodeInfo.osImage}</DrawerItem>
            <DrawerItem name="Kernel version">{nodeInfo.kernelVersion}</DrawerItem>
            <DrawerItem name="Container runtime">{nodeInfo.containerRuntimeVersion}</DrawerItem>
            <DrawerItem name="Kubelet version">{nodeInfo.kubeletVersion}</DrawerItem>
          </>
        )}
        {taints.length > 0 && (
          <DrawerItem name="Taints" labelsOnly>
            {taints.map((taint) => (
              <Badge key={taint.key} label={formatNodeTaint(taint)} />
            ))}
          </DrawerItem>
        )}
        <KubeObjectConditionsDrawer object={node} />
        <DrawerTitle>Capacity</DrawerTitle>
        <NodeDetailsResources node={node} type="capacity" />
        <DrawerTitle>Allocatable</DrawerTitle>
        <NodeDetailsResources node={node} type="allocatable" />
        <PodDetailsList
          pods={childPods}
          owner={node}
          maxCpu={node.getCpuCapacity()}
          maxMemory={node.getMemoryCapacity()}
        />
      </div>
    );
  }
}

export const NodeDetails = withInjectables<Dependencies, NodeDetailsProps>(NonInjectedNodeDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    podStore: di.inject(podStoreInjectable),
    logger: di.inject(loggerInjectionToken),
    loadPodsFromAllNamespaces: di.inject(loadPodsFromAllNamespacesInjectable),
  }),
});
