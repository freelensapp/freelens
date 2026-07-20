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
import { makeObservable, observable } from "mobx";
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
  nodeGroup = "nodeGroup",
  capacityType = "capacityType",
  taints = "taints",
  roles = "roles",
  version = "version",
  internalIp = "internalIp",
  age = "age",
  schedulable = "schedulable",
  conditions = "condition",
  status = "status",
}

interface UsageArgs {
  node: Node;
  title: string;
  usage?: number;
  capacity?: number;
  requests?: number;
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

function getNodeGroup(node: Node): string {
  const labels = node.metadata.labels ?? {};

  return (
    labels["eks.amazonaws.com/nodegroup"] ?? // EKS managed node group
    labels["karpenter.sh/nodepool"] ?? // Karpenter (any cloud)
    labels["karpenter.k8s.aws/ec2nodeclass"] ?? // Karpenter AWS
    labels["cloud.google.com/gke-nodepool"] ?? // GKE
    labels["kubernetes.azure.com/agentpool"] ?? // AKS
    labels["agentpool"] ?? // AKS (legacy)
    ""
  );
}

function getCapacityType(node: Node): string {
  const labels = node.metadata.labels ?? {};

  // already normalized: "spot" | "on-demand"
  const karpenterCapacityType = labels["karpenter.sh/capacity-type"];
  if (karpenterCapacityType) {
    return karpenterCapacityType;
  }

  // EKS: "SPOT" | "ON_DEMAND"
  const eksCapacityType = labels["eks.amazonaws.com/capacityType"];
  if (eksCapacityType) {
    return eksCapacityType.toLowerCase().replace(/_/g, "-");
  }

  // GKE: "spot" | "standard"
  const gkeProvisioning = labels["cloud.google.com/gke-provisioning"];
  if (gkeProvisioning) {
    return gkeProvisioning === "standard" ? "on-demand" : gkeProvisioning;
  }

  // GKE spot VMs (>= 1.20) and legacy preemptible VMs
  if (labels["cloud.google.com/gke-spot"] === "true") {
    return "spot";
  }
  if (labels["cloud.google.com/gke-preemptible"] === "true") {
    return "preemptible";
  }

  // AKS: "Spot" | "Regular"
  const aksScaleSetPriority = labels["kubernetes.azure.com/scalesetpriority"];
  if (aksScaleSetPriority) {
    const priority = aksScaleSetPriority.toLowerCase();

    return priority === "regular" ? "on-demand" : priority;
  }

  return (labels["capacity-type"] ?? "").toLowerCase().replace(/_/g, "-");
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

  // Plain getter (not @computed): reads this.props, which mobx-react 9 forbids
  // inside a derivation. Read from render, reactivity is preserved by the
  // observer render reaction.
  get podsByNode(): Map<string, Pod[]> {
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

  private renderUsage({ node, title, usage, capacity, requests, usageText, tooltipLines = [] }: UsageArgs) {
    const hasUsage = usage !== undefined && Number.isFinite(usage);
    const hasRequests = requests !== undefined && requests > 0;
    // requests come from pod specs, so the bar is still useful without any usage metrics
    const hasBar = !!capacity && (hasUsage || hasRequests);

    if (!hasBar && !usageText) {
      return <span className="usageText">N/A</span>;
    }

    const tooltipId = `node-${title.toLowerCase()}-usage-${node.getId()}`;

    return (
      <div className="metrics" id={tooltipId}>
        {hasBar && (
          <LineProgress
            max={capacity}
            value={hasUsage ? usage : 0}
            secondaryValue={hasRequests ? requests : undefined}
          />
        )}
        {usageText && <span className="usageText">{usageText}</span>}
        {tooltipLines.length > 0 && (
          <Tooltip targetId={tooltipId} preferredPositions={TooltipPosition.BOTTOM} style={{ whiteSpace: "pre-line" }}>
            {tooltipLines.join("\n")}
          </Tooltip>
        )}
      </div>
    );
  }

  renderCpuUsage(node: Node) {
    const [promUsage, promCapacity] = this.getLastMetricValues(node, ["cpuUsage", "cpuCapacity"]);
    const { cpu: kubeUsage } = this.props.nodeStore.getNodeKubeMetrics(node);
    const { cpu: requests } = this.getNodeResourceRequests(node);
    const allocatable = cpuUnitsToNumber(node.status?.allocatable?.cpu ?? "") ?? 0;
    const podsLoaded = this.props.podStore.isLoaded;

    // prefer prometheus metrics for the bar, fall back to metrics-server usage vs node allocatable
    const usage = (promCapacity ? promUsage : kubeUsage) ?? NaN;
    const capacity = promCapacity || allocatable;
    const textUsage = Number.isFinite(kubeUsage) ? kubeUsage : usage;

    const tooltipLines: string[] = [];

    if (Number.isFinite(usage) && capacity) {
      tooltipLines.push(`CPU: ${((usage * 100) / capacity).toFixed(2)}%, cores: ${formatCores(capacity)}`);
    }
    tooltipLines.push(`Usage: ${formatCores(textUsage)} cores`);
    if (podsLoaded) {
      tooltipLines.push(
        `Requests: ${formatCores(requests)} cores${
          allocatable
            ? ` (${((requests * 100) / allocatable).toFixed(0)}% of allocatable ${formatCores(allocatable)})`
            : ""
        }`,
      );
    }

    return this.renderUsage({
      node,
      title: "CPU",
      usage,
      capacity,
      requests: podsLoaded ? requests : undefined,
      usageText: podsLoaded ? `${formatCores(textUsage)} / ${formatCores(requests)}` : formatCores(textUsage),
      tooltipLines,
    });
  }

  renderMemoryUsage(node: Node) {
    const [promUsage, promCapacity] = this.getLastMetricValues(node, [
      "workloadMemoryUsage",
      "memoryAllocatableCapacity",
    ]);
    const { memory: kubeUsage } = this.props.nodeStore.getNodeKubeMetrics(node);
    const { memory: requests } = this.getNodeResourceRequests(node);
    const allocatable = unitsToBytes(node.status?.allocatable?.memory ?? "") || 0;
    const podsLoaded = this.props.podStore.isLoaded;

    // prefer prometheus metrics for the bar, fall back to metrics-server usage vs node allocatable
    const usage = (promCapacity ? promUsage : kubeUsage) ?? NaN;
    const capacity = promCapacity || allocatable;
    const textUsage = Number.isFinite(kubeUsage) ? kubeUsage : usage;

    const tooltipLines: string[] = [];

    if (Number.isFinite(usage) && capacity) {
      tooltipLines.push(`Memory: ${((usage * 100) / capacity).toFixed(2)}%, ${bytesToUnits(usage, { precision: 3 })}`);
    }
    tooltipLines.push(`Usage: ${bytesToUnits(textUsage, { precision: 3 })}`);
    if (podsLoaded) {
      tooltipLines.push(
        `Requests: ${bytesToUnits(requests, { precision: 3 })}${
          allocatable
            ? ` (${((requests * 100) / allocatable).toFixed(0)}% of allocatable ${bytesToUnits(allocatable, { precision: 3 })})`
            : ""
        }`,
      );
    }

    return this.renderUsage({
      node,
      title: "Memory",
      usage,
      capacity,
      requests: podsLoaded ? requests : undefined,
      usageText: podsLoaded
        ? `${bytesToUnitsAligned(textUsage)} / ${bytesToUnitsAligned(requests)}`
        : bytesToUnitsAligned(textUsage),
      tooltipLines,
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
    const [usage, capacity] = this.getLastMetricValues(node, ["fsUsage", "fsSize"]);
    const tooltipLines =
      usage !== undefined && capacity
        ? [`Disk: ${((usage * 100) / capacity).toFixed(2)}%, ${bytesToUnits(usage, { precision: 3 })}`]
        : [];

    return this.renderUsage({
      node,
      title: "Disk",
      usage,
      capacity,
      tooltipLines,
    });
  }

  render() {
    const { nodeStore, eventStore } = this.props;

    return (
      <TabLayout>
        <KubeObjectListLayout
          isConfigurable
          defaultHiddenTableColumns={[columnId.pods, columnId.instanceType, columnId.nodeGroup, columnId.capacityType]}
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
            [columnId.nodeGroup]: (node) => getNodeGroup(node),
            [columnId.capacityType]: (node) => getCapacityType(node),
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
            (node) => getNodeGroup(node),
            (node) => getCapacityType(node),
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
            {
              title: "Node Group",
              className: "nodeGroup",
              sortBy: columnId.nodeGroup,
              id: columnId.nodeGroup,
            },
            {
              title: "Capacity",
              className: "capacityType",
              sortBy: columnId.capacityType,
              id: columnId.capacityType,
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
              <WithTooltip>{getNodeGroup(node)}</WithTooltip>,
              <WithTooltip>{getCapacityType(node)}</WithTooltip>,
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
