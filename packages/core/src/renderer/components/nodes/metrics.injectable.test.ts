/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Node } from "@freelensapp/kube-object";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import requestClusterMetricsByNodeNamesInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-cluster-metrics-by-node-names.injectable";
import nodeMetricsInjectable from "./metrics.injectable";

describe("node-metrics injectable", () => {
  it("requests exactly the node metric series consumed by node charts and route views", () => {
    const di = getDiForUnitTesting();
    const requestClusterMetricsByNodeNames = jest.fn().mockResolvedValue({});
    const node = new Node({
      apiVersion: "v1",
      kind: "Node",
      metadata: {
        uid: "node-uid",
        name: "worker-1",
        resourceVersion: "1",
        selfLink: "/api/v1/nodes/worker-1",
      },
      spec: {},
      status: {},
    });

    di.override(requestClusterMetricsByNodeNamesInjectable, () => requestClusterMetricsByNodeNames);

    const metrics = di.inject(nodeMetricsInjectable, node);

    metrics.value.get();

    expect(requestClusterMetricsByNodeNames).toHaveBeenCalledWith(["worker-1"], {
      metrics: [
        "memoryUsage",
        "workloadMemoryUsage",
        "memoryRequests",
        "memoryCapacity",
        "memoryAllocatableCapacity",
        "cpuUsage",
        "cpuRequests",
        "cpuCapacity",
        "cpuAllocatableCapacity",
        "podUsage",
        "podCapacity",
        "fsSize",
        "fsUsage",
      ],
    });
  });
});
