/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./nodes.scss";

import { formatNodeTaint } from "@freelensapp/kube-object";
import { Tooltip, TooltipPosition } from "@freelensapp/tooltip";
import { bytesToUnits, cpuUnitsToNumber, interval, unitsToBytes } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { computed, makeObservable, observable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import requestAllNodeMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-metrics-for-all-nodes.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import { BadgeBoolean } from "../badge";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectConditionsList } from "../kube-object-conditions";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { TabLayout } from "../layout/tab-layout-2";
import { LineProgress } from "../line-progress";
import { WithTooltip } from "../with-tooltip";
import loadPodsFromAllNamespacesInjectable from "../workloads-pods/load-pods-from-all-namespaces.injectable";
import podStoreInjectable from "../workloads-pods/store.injectable";
import nodeStoreInjectable from "./store.injectable";

import type { Node, Pod } from "@freelensapp/kube-object";

import type {
  NodeMetricData,
  RequestAllNodeMetrics,
} from "../../../common/k8s-api/endpoints/metrics.api/request-metrics-for-all-nodes.injectable";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import type { EventStore } from "../events/store";
import type { PodStore } from "../workloads-pods/store";
import type { NodeStore } from "./store";

enum columnId {
  name = "name",
  cpu = "cpu",
  memory = "memory",
  disk = "disk",
  pods = "pods",
  instanceType = "instanceType",
  taints = "taints",
  roles = "roles",
  version = "version",
  internalIp = "internalIp",
  age = "age",
  schedulable = "schedulable",
  conditions = "condition",
  status = "status",
}

type MetricsTooltipFormatter = (metrics: [number, number]) => string;

interface UsageArgs {
  node: Node;
  title: string;
  metricNames: [keyof NodeMetricData, keyof NodeMetricData];
  formatters: MetricsTooltipFormatter[];
  usageText?: string;
  tooltipLines?: string[];
}

interface Dependencies {
  requestAllNodeMetrics: RequestAllNodeMetrics;
  nodeStore: NodeStore;
  eventStore: EventStore;
  podStore: PodStore;
  subscribeStores: SubscribeStores;
  loadPodsFromAllNamespaces: () => void;
}

function bytesToUnitsAligned(bytes: number): string {
  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(1)}Ki`;
  }
  return bytesToUnits(bytes, { precision: 1 }).replace(/B$/, "");
}

function getInstanceType(node: Node): string {
  const labels = node.metadata.labels ?? {};

  return labels["node.kubernetes.io/instance-type"] ?? labels["beta.kubernetes.io/instance-type"] ?? "";
}

function formatCores(cores: number): string {
  if (isNaN(cores)) {
    return "N/A";
  }

  return cores < 10 ? cores.toFixed(2) : cores.toFixed(1);
}

@observer
class NonInjectedNodesRoute extends React.Component<Dependencies> {
  @observable metrics: NodeMetricData | null = null;

  private metricsWatcher = interval(30, () => {
    void (async () => {
      await this.props.nodeStore.loadKubeMetrics();
      this.metrics = await this.props.requestAllNodeMetrics();
    })();
  });

  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    this.metricsWatcher.start(true);

    disposeOnUnmount(this, [this.props.subscribeStores([this.props.podStore])]);

    this.props.loadPodsFromAllNamespaces();
  }

  componentWillUnmount() {
    this.metricsWatcher.stop();
  }

  @computed get podsByNode(): Map<string, Pod[]> {
    const podsByNode = new Map<string, Pod[]>();

    if (!this.props.podStore.isLoaded) {
      return podsByNode;
    }

    for (const pod of this.props.podStore.items) {
      const nodeName = pod.spec.nodeName;
      const phase = pod.getStatusPhase();

      if (!nodeName || phase === "Succeeded" || phase === "Failed") {
        continue;
      }

      const pods = podsByNode.get(nodeName);

      if (pods) {
        pods.push(pod);
      } else {
        podsByNode.set(nodeName, [pod]);
      }
    }

    return podsByNode;
  }

  getNonTerminatedPods(node: Node): Pod[] {
    return this.podsByNode.get(node.getName()) ?? [];
  }

  getNodePodCapacity(node: Node): number {
    const podsCapacity = node.status?.allocatable?.pods ?? node.status?.capacity?.pods;

    return podsCapacity ? parseInt(podsCapacity, 10) : 0;
  }

  getNodeResourceRequests(node: Node): { cpu: number; memory: number } {
    let cpu = 0;
    let memory = 0;

    for (const pod of this.getNonTerminatedPods(node)) {
      for (const container of pod.getContainers()) {
        const requests = container.resources?.requests;

        cpu += cpuUnitsToNumber(requests?.cpu ?? "") ?? 0;
        memory += unitsToBytes(requests?.memory ?? "") || 0;
      }
    }

    return { cpu, memory };
  }

  getLastMetricValues(node: Node, metricNames: (keyof NodeMetricData)[]): number[] {
    if (!this.metrics) {
      return [];
    }

    const nodeName = node.getName();

    return metricNames.map((metricName) => {
      try {
        const metric = this.metrics?.[metricName];
        const result = metric?.data.result.find(
          ({ metric: { node, instance, kubernetes_node } }) =>
            nodeName === node || nodeName === instance || nodeName === kubernetes_node,
        );

        return result ? parseFloat(result.values.slice(-1)[0][1]) : 0;
      } catch (e) {
        return 0;
      }
    });
  }

  private renderUsage({ node, title, metricNames, formatters, usageText, tooltipLines = [] }: UsageArgs) {
    const metrics = this.getLastMetricValues(node, metricNames);
    const hasMetrics = metrics.length >= 2 && metrics[1] != 0;

    if (!hasMetrics && !usageText) {
      return <span className="usageText">N/A</span>;
    }

    const tooltipId = `node-${title.toLowerCase()}-usage-${node.getId()}`;
    const lines = [...tooltipLines];

    if (hasMetrics) {
      const [usage, capacity] = metrics;

      lines.unshift(`${title}: ${formatters.map((formatter) => formatter([usage, capacity])).join(", ")}`);
    }

    return (
      <div className="metrics" id={tooltipId}>
        {hasMetrics && <LineProgress max={metrics[1]} value={metrics[0]} />}
        {usageText && <span className="usageText">{usageText}</span>}
        {lines.length > 0 && (
          <Tooltip targetId={tooltipId} preferredPositions={TooltipPosition.BOTTOM} style={{ whiteSpace: "pre-line" }}>
            {lines.join("\n")}
          </Tooltip>
        )}
      </div>
    );
  }

  renderCpuUsage(node: Node) {
    const { cpu: usage } = this.props.nodeStore.getNodeKubeMetrics(node);
    const { cpu: requests } = this.getNodeResourceRequests(node);
    const allocatable = cpuUnitsToNumber(node.status?.allocatable?.cpu ?? "") ?? 0;
    const podsLoaded = this.props.podStore.isLoaded;

    return this.renderUsage({
      node,
      title: "CPU",
      metricNames: ["cpuUsage", "cpuCapacity"],
      formatters: [([usage, capacity]) => `${((usage * 100) / capacity).toFixed(2)}%`, ([, cap]) => `cores: ${cap}`],
      usageText: podsLoaded ? `${formatCores(usage)} / ${formatCores(requests)}` : formatCores(usage),
      tooltipLines: [
        `Usage: ${formatCores(usage)} cores`,
        ...(podsLoaded
          ? [
              `Requests: ${formatCores(requests)} cores${
                allocatable
                  ? ` (${((requests * 100) / allocatable).toFixed(0)}% of allocatable ${formatCores(allocatable)})`
                  : ""
              }`,
            ]
          : []),
      ],
    });
  }

  renderMemoryUsage(node: Node) {
    const { memory: usage } = this.props.nodeStore.getNodeKubeMetrics(node);
    const { memory: requests } = this.getNodeResourceRequests(node);
    const allocatable = unitsToBytes(node.status?.allocatable?.memory ?? "") || 0;
    const podsLoaded = this.props.podStore.isLoaded;

    return this.renderUsage({
      node,
      title: "Memory",
      metricNames: ["workloadMemoryUsage", "memoryAllocatableCapacity"],
      formatters: [
        ([usage, capacity]) => `${((usage * 100) / capacity).toFixed(2)}%`,
        ([usage]) => bytesToUnits(usage, { precision: 3 }),
      ],
      usageText: podsLoaded
        ? `${bytesToUnitsAligned(usage)} / ${bytesToUnitsAligned(requests)}`
        : bytesToUnitsAligned(usage),
      tooltipLines: [
        `Usage: ${bytesToUnits(usage, { precision: 3 })}`,
        ...(podsLoaded
          ? [
              `Requests: ${bytesToUnits(requests, { precision: 3 })}${
                allocatable
                  ? ` (${((requests * 100) / allocatable).toFixed(0)}% of allocatable ${bytesToUnits(allocatable, { precision: 3 })})`
                  : ""
              }`,
            ]
          : []),
      ],
    });
  }

  renderPodsUsage(node: Node) {
    if (!this.props.podStore.isLoaded) {
      return <span className="usageText">N/A</span>;
    }

    const podCount = this.getNonTerminatedPods(node).length;
    const capacity = this.getNodePodCapacity(node);

    if (!capacity) {
      return <span className="usageText">{podCount}</span>;
    }

    const tooltipId = `node-pods-usage-${node.getId()}`;

    return (
      <div className="metrics" id={tooltipId}>
        <LineProgress max={capacity} value={podCount} />
        <span className="usageText">{`${podCount} / ${capacity}`}</span>
        <Tooltip targetId={tooltipId} preferredPositions={TooltipPosition.BOTTOM}>
          {`Pods: ${podCount} of ${capacity} allocatable (${((podCount * 100) / capacity).toFixed(0)}%)`}
        </Tooltip>
      </div>
    );
  }

  renderDiskUsage(node: Node) {
    return this.renderUsage({
      node,
      title: "Disk",
      metricNames: ["fsUsage", "fsSize"],
      formatters: [
        ([usage, capacity]) => `${((usage * 100) / capacity).toFixed(2)}%`,
        ([usage]) => bytesToUnits(usage, { precision: 3 }),
      ],
    });
  }

  render() {
    const { nodeStore, eventStore } = this.props;

    return (
      <TabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="nodes"
          className="Nodes"
          store={nodeStore}
          isReady={nodeStore.isLoaded}
          dependentStores={[eventStore]}
          isSelectable={false}
          sortingCallbacks={{
            [columnId.name]: (node) => node.getName(),
            [columnId.cpu]: (node) => this.getLastMetricValues(node, ["cpuUsage"]),
            [columnId.memory]: (node) => this.getLastMetricValues(node, ["memoryUsage"]),
            [columnId.disk]: (node) => this.getLastMetricValues(node, ["fsUsage"]),
            [columnId.pods]: (node) => this.getNonTerminatedPods(node).length,
            [columnId.instanceType]: (node) => getInstanceType(node),
            [columnId.taints]: (node) => node.getTaints().length,
            [columnId.roles]: (node) => node.getRoleLabels(),
            [columnId.version]: (node) => node.getKubeletVersion(),
            [columnId.internalIp]: (node) => node.getInternalIP(),
            [columnId.age]: (node) => -node.getCreationTimestamp(),
            [columnId.schedulable]: (node) => (node.isUnschedulable() ? "False" : "True"),
            [columnId.conditions]: (node) => node.getNodeConditionText(),
          }}
          searchFilters={[
            (node) => node.getSearchFields(),
            (node) => node.getRoleLabels(),
            (node) => node.getKubeletVersion(),
            (node) => node.getNodeConditionText(),
            (node) => node.getInternalIP(),
            (node) => node.getExternalIP(),
            (node) => getInstanceType(node),
          ]}
          renderHeaderTitle="Nodes"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "CPU", className: "cpu", sortBy: columnId.cpu, id: columnId.cpu },
            { title: "Memory", className: "memory", sortBy: columnId.memory, id: columnId.memory },
            { title: "Disk", className: "disk", sortBy: columnId.disk, id: columnId.disk },
            { title: "Pods", className: "pods", sortBy: columnId.pods, id: columnId.pods },
            {
              title: "Instance Type",
              className: "instanceType",
              sortBy: columnId.instanceType,
              id: columnId.instanceType,
            },
            { title: "Roles", className: "roles", sortBy: columnId.roles, id: columnId.roles },
            { title: "Taints", className: "taints", sortBy: columnId.taints, id: columnId.taints },
            { title: "Version", className: "version", sortBy: columnId.version, id: columnId.version },
            { title: "Internal IP", className: "internalIp", sortBy: columnId.internalIp, id: columnId.internalIp },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Schedulable", className: "schedulable", sortBy: columnId.schedulable, id: columnId.schedulable },
            {
              title: "Conditions",
              className: "conditions scrollable",
              sortBy: columnId.conditions,
              id: columnId.conditions,
            },
          ]}
          renderTableContents={(node) => {
            const tooltipId = `node-taints-${node.getId()}`;
            const taints = node.getTaints();

            return [
              <WithTooltip>{node.getName()}</WithTooltip>,
              this.renderCpuUsage(node),
              this.renderMemoryUsage(node),
              this.renderDiskUsage(node),
              this.renderPodsUsage(node),
              <WithTooltip>{getInstanceType(node)}</WithTooltip>,
              <WithTooltip>{node.getRoleLabels()}</WithTooltip>,
              <>
                <span id={tooltipId}>{taints.length}</span>
                <Tooltip targetId={tooltipId} tooltipOnParentHover={true} style={{ whiteSpace: "pre-line" }}>
                  {taints.map(formatNodeTaint).join("\n")}
                </Tooltip>
              </>,
              <WithTooltip>{node.getKubeletVersion()}</WithTooltip>,
              <WithTooltip>{node.getInternalIP()}</WithTooltip>,
              <KubeObjectAge key="age" object={node} />,
              <BadgeBoolean value={!node.isUnschedulable()} />,
              <KubeObjectConditionsList key="conditions" object={node} />,
            ];
          }}
        />
      </TabLayout>
    );
  }
}

export const NodesRoute = withInjectables<Dependencies>(NonInjectedNodesRoute, {
  getProps: (di, props) => ({
    ...props,
    nodeStore: di.inject(nodeStoreInjectable),
    eventStore: di.inject(eventStoreInjectable),
    requestAllNodeMetrics: di.inject(requestAllNodeMetricsInjectable),
    podStore: di.inject(podStoreInjectable),
    subscribeStores: di.inject(subscribeStoresInjectable),
    loadPodsFromAllNamespaces: di.inject(loadPodsFromAllNamespacesInjectable),
  }),
});
