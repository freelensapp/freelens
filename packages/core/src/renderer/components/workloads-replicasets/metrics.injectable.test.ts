/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForReplicaSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-replica-sets.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import replicaSetMetricsInjectable from "./metrics.injectable";

import type { ReplicaSet } from "@freelensapp/kube-object";

describe("replica-set-metrics injectable", () => {
  it("requests replica set pod metrics with the selected time range", () => {
    const di = getDiForUnitTesting();
    const requestPodMetricsForReplicaSets = vi.fn().mockResolvedValue({});
    const replicaSet = {
      getId: () => "replica-set-id",
      getName: () => "replica-set-name",
      getNs: () => "replica-set-ns",
    } as unknown as ReplicaSet;

    di.override(requestPodMetricsForReplicaSetsInjectable, () => requestPodMetricsForReplicaSets);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 3000, end: 3100, range: 100 }),
      },
    }));

    const metrics = di.inject(replicaSetMetricsInjectable, { replicaSet });

    metrics.value.get();

    expect(requestPodMetricsForReplicaSets).toHaveBeenCalledWith([replicaSet], "replica-set-ns", undefined, {
      start: 3000,
      end: 3100,
      range: 100,
    });
  });
});
