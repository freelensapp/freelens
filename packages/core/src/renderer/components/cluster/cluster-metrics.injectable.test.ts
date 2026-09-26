/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import clusterOverviewMetricsInjectable from "./cluster-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "./overview/selected-metrics-time-range.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

import type { MetricNodeRole } from "./overview/storage.injectable";

describe("cluster-overview-metrics injectable", () => {
  const timestamps = { start: 100, end: 200, range: 100 };

  const setup = ({
    role,
    masterNodes,
    workerNodes,
  }: {
    role: MetricNodeRole;
    masterNodes: string[];
    workerNodes: string[];
  }) => {
    const di = getDiForUnitTesting();
    const requestClusterMetricsByNodeNames = vi.fn().mockResolvedValue({});
    const nodes = (role === "master" ? masterNodes : workerNodes).map((name) => ({ getName: () => name }));

    di.override(requestClusterMetricsByNodeNamesInjectable, () => requestClusterMetricsByNodeNames);
    di.override(selectedMetricsTimeRangeInjectable, () => ({ timestamps: computed(() => timestamps) }) as never);
    di.override(
      selectedNodeRoleForMetricsInjectable,
      () =>
        ({
          value: computed(() => role),
          nodes: computed(() => nodes),
          hasMasterNodes: computed(() => masterNodes.length > 0),
          hasWorkerNodes: computed(() => workerNodes.length > 0),
          set: vi.fn(),
        }) as never,
    );

    di.inject(clusterOverviewMetricsInjectable).value.get();

    return { requestClusterMetricsByNodeNames };
  };

  it("does not filter by node names when the cluster only has worker nodes", () => {
    const { requestClusterMetricsByNodeNames } = setup({
      role: "worker",
      masterNodes: [],
      workerNodes: ["worker-1", "worker-2"],
    });

    expect(requestClusterMetricsByNodeNames).toHaveBeenCalledWith([], timestamps);
  });

  it("does not filter by node names when the cluster only has master nodes", () => {
    const { requestClusterMetricsByNodeNames } = setup({
      role: "master",
      masterNodes: ["master-1"],
      workerNodes: [],
    });

    expect(requestClusterMetricsByNodeNames).toHaveBeenCalledWith([], timestamps);
  });

  it("does not filter by node names before the nodes are loaded", () => {
    const { requestClusterMetricsByNodeNames } = setup({
      role: "worker",
      masterNodes: [],
      workerNodes: [],
    });

    expect(requestClusterMetricsByNodeNames).toHaveBeenCalledWith([], timestamps);
  });

  it("filters by the worker node names when the cluster has both roles and worker is selected", () => {
    const { requestClusterMetricsByNodeNames } = setup({
      role: "worker",
      masterNodes: ["master-1"],
      workerNodes: ["worker-1", "worker-2"],
    });

    expect(requestClusterMetricsByNodeNames).toHaveBeenCalledWith(["worker-1", "worker-2"], timestamps);
  });

  it("filters by the master node names when the cluster has both roles and master is selected", () => {
    const { requestClusterMetricsByNodeNames } = setup({
      role: "master",
      masterNodes: ["master-1"],
      workerNodes: ["worker-1", "worker-2"],
    });

    expect(requestClusterMetricsByNodeNames).toHaveBeenCalledWith(["master-1"], timestamps);
  });
});
