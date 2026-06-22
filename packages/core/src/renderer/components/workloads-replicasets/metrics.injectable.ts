/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForReplicaSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-replica-sets.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { ReplicaSet } from "@freelensapp/kube-object";

interface ReplicaSetMetricsInjectableParams {
  replicaSet: ReplicaSet;
}

const replicaSetMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "replica-set-metrics",
  getObject: ({ replicaSet }: ReplicaSetMetricsInjectableParams) => replicaSet,
  getObjectId: (replicaSet) => replicaSet.getId(),
  request: ({ di, object: replicaSet, start, end, range }) =>
    di.inject(requestPodMetricsForReplicaSetsInjectable)([replicaSet], replicaSet.getNs(), undefined, {
      start,
      end,
      range,
    }),
});

export default replicaSetMetricsInjectable;
