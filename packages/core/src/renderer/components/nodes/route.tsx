/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./nodes.scss";

import { formatNodeTaint } from "@freelensapp/kube-object";
import { Tooltip, TooltipPosition } from "@freelensapp/tooltip";
import { bytesToUnits, cssNames, interval } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import upperFirst from "lodash/upperFirst";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import requestAllNodeMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-metrics-for-all-nodes.injectable";
import eventStoreInjectable from "../events/store.injectable";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { TabLayout } from "../layout/tab-layout-2";
import { LineProgress } from "../line-progress";
import { WithTooltip } from "../with-tooltip";
import nodeStoreInjectable from "./store.injectable";

import type { Node } from "@freelensapp/kube-object";

import type {
  NodeMetricData,
  RequestAllNodeMetrics,
} from "../../../common/k8s-api/endpoints/metrics.api/request-metrics-for-all-nodes.injectable";
import type { EventStore } from "../events/store";
import type { NodeStore } from "./store";

enum columnId {
  name = "name",
  cpu = "cpu",
  memory = "memory",
  disk = "disk",
  conditions = "condition",
  taints = "taints",
  roles = "roles",
  age = "age",
  version = "version",
  internalIp = "internalIp",
  status = "status",
}

type MetricsTooltipFormatter = (metrics: [number, number]) => string;

interface UsageArgs {
  node: Node;
  title: string;
  metricNames: [keyof NodeMetricData, keyof NodeMetricData];
  formatters: MetricsTooltipFormatter[];
  usageText?: string;
}

interface Dependencies {
  requestAllNodeMetrics: RequestAllNodeMetrics;
  nodeStore: NodeStore;
  eventStore: EventStore;
}

function bytesToUnitsAligned(bytes: number): string {
  if (bytes < 1024) {
    return `${(bytes / 1024).toFixed(1)}Ki`;
  }
  return bytesToUnits(bytes, { precision: 1 }).replace(/B$/, "");
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
  }

  componentWillUnmount() {
    this.metricsWatcher.stop();
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

  getNodeCpuUsage(node: Node) {
    const metrics = this.props.nodeStore.getNodeKubeMetrics(node);

    return bytesToUnitsAligned(metrics.cpu);
  }

  getNodeMemoryUsage(node: Node) {
    const metrics = this.props.nodeStore.getNodeKubeMetrics(node);

    return bytesToUnitsAligned(metrics.memory);
  }

  private renderUsage({ node, title, metricNames, formatters, usageText }: UsageArgs) {
    const metrics = this.getLastMetricValues(node, metricNames);

    if (!metrics || metrics.length < 2 || metrics[1] == 0) {
      return <span className="usageText">{usageText ?? "N/A"}</span>;
    }

    const [usage, capacity] = metrics;

    return (
      <LineProgress
        max={capacity}
        value={usage}
        tooltip={{
          preferredPositions: TooltipPosition.BOTTOM,
          children: `${title}: ${(title === "CPU" && usageText ? [usageText] : [])
            .concat(formatters.map((formatter) => formatter([usage, capacity])))
            .join(", ")}`,
        }}
      />
    );
  }

  renderCpuUsage(node: Node) {
    return this.renderUsage({
      node,
      title: "CPU",
      metricNames: ["cpuUsage", "cpuCapacity"],
      formatters: [([usage, capacity]) => `${((usage * 100) / capacity).toFixed(2)}%`, ([, cap]) => `cores: ${cap}`],
      usageText: this.getNodeCpuUsage(node),
    });
  }

  renderMemoryUsage(node: Node) {
    return this.renderUsage({
      node,
      title: "Memory",
      metricNames: ["workloadMemoryUsage", "memoryAllocatableCapacity"],
      formatters: [
        ([usage, capacity]) => `${((usage * 100) / capacity).toFixed(2)}%`,
        ([usage]) => bytesToUnits(usage, { precision: 3 }),
      ],
      usageText: this.getNodeMemoryUsage(node),
    });
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

  renderConditions(node: Node) {
    if (!node.status?.conditions) {
      return null;
    }

    return node.getActiveConditions().map((condition) => {
      const { type } = condition;
      const tooltipId = `node-${node.getName()}-condition-${type}`;

      return (
        <div key={type} id={tooltipId} className={cssNames("condition", kebabCase(type))}>
          {type}
          <Tooltip targetId={tooltipId} formatters={{ tableView: true }}>
            {Object.entries(condition).map(([key, value]) => (
              <div key={key} className="flex gaps align-center">
                <div className="name">{upperFirst(key)}</div>
                <div className="value">{value}</div>
              </div>
            ))}
          </Tooltip>
        </div>
      );
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
            [columnId.conditions]: (node) => node.getNodeConditionText(),
            [columnId.taints]: (node) => node.getTaints().length,
            [columnId.roles]: (node) => node.getRoleLabels(),
            [columnId.version]: (node) => node.getKubeletVersion(),
            [columnId.internalIp]: (node) => node.getInternalIP(),
            [columnId.age]: (node) => -node.getCreationTimestamp(),
          }}
          searchFilters={[
            (node) => node.getSearchFields(),
            (node) => node.getRoleLabels(),
            (node) => node.getKubeletVersion(),
            (node) => node.getNodeConditionText(),
            (node) => node.getInternalIP(),
            (node) => node.getExternalIP(),
          ]}
          renderHeaderTitle="Nodes"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "CPU", className: "cpu", sortBy: columnId.cpu, id: columnId.cpu },
            { title: "Memory", className: "memory", sortBy: columnId.memory, id: columnId.memory },
            { title: "Disk", className: "disk", sortBy: columnId.disk, id: columnId.disk },
            { title: "Taints", className: "taints", sortBy: columnId.taints, id: columnId.taints },
            { title: "Roles", className: "roles", sortBy: columnId.roles, id: columnId.roles },
            { title: "Version", className: "version", sortBy: columnId.version, id: columnId.version },
            { title: "Internal IP", className: "internalIp", sortBy: columnId.internalIp, id: columnId.internalIp },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Conditions", className: "conditions", sortBy: columnId.conditions, id: columnId.conditions },
          ]}
          renderTableContents={(node) => {
            const tooltipId = `node-taints-${node.getId()}`;
            const taints = node.getTaints();

            return [
              <WithTooltip>{node.getName()}</WithTooltip>,
              <KubeObjectStatusIcon key="icon" object={node} />,
              this.renderCpuUsage(node),
              this.renderMemoryUsage(node),
              this.renderDiskUsage(node),
              <>
                <span id={tooltipId}>{taints.length}</span>
                <Tooltip targetId={tooltipId} tooltipOnParentHover={true} style={{ whiteSpace: "pre-line" }}>
                  {taints.map(formatNodeTaint).join("\n")}
                </Tooltip>
              </>,
              <WithTooltip>{node.getRoleLabels()}</WithTooltip>,
              <WithTooltip>{node.getKubeletVersion()}</WithTooltip>,
              <WithTooltip>{node.getInternalIP()}</WithTooltip>,
              <KubeObjectAge key="age" object={node} />,
              this.renderConditions(node),
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
  }),
});
