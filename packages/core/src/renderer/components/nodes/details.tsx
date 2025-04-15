/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./details.scss";

import { Node, formatNodeTaint } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import upperFirst from "lodash/upperFirst";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import { DrawerTitle } from "../drawer/drawer-title";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import loadPodsFromAllNamespacesInjectable from "../workloads-pods/load-pods-from-all-namespaces.injectable";
import { PodDetailsList } from "../workloads-pods/pod-details-list";
import type { PodStore } from "../workloads-pods/store";
import podStoreInjectable from "../workloads-pods/store.injectable";
import { NodeDetailsResources } from "./details-resources";

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
    const conditions = node.getActiveConditions();
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
        {conditions && (
          <DrawerItem name="Conditions" className="conditions" labelsOnly>
            {conditions.map((condition) => (
              <Badge
                key={condition.type}
                label={condition.type}
                className={kebabCase(condition.type)}
                tooltip={{
                  formatters: {
                    tableView: true,
                  },
                  children: Object.entries(condition).map(([key, value]) => (
                    <div key={key} className="flex gaps align-center">
                      <div className="name">{upperFirst(key)}</div>
                      <div className="value">{value}</div>
                    </div>
                  )),
                }}
              />
            ))}
          </DrawerItem>
        )}
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
