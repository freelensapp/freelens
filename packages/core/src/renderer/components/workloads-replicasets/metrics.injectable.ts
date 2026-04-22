/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsForReplicaSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-replica-sets.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { ReplicaSet } from "@freelensapp/kube-object";

interface ReplicaSetMetricsInjectableParams {
  replicaSet: ReplicaSet;
  timeRangeKey: string;
}

const replicaSetMetricsInjectable = getInjectable({
  id: "replica-set-metrics",
  instantiate: (di, { replicaSet }: ReplicaSetMetricsInjectableParams) => {
    const requestPodMetricsForReplicaSets = di.inject(requestPodMetricsForReplicaSetsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        now(60 * 1000); // update every minute
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestPodMetricsForReplicaSets([replicaSet], replicaSet.getNs(), undefined, {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { replicaSet, timeRangeKey }: ReplicaSetMetricsInjectableParams) =>
      `${replicaSet.getId()}-${timeRangeKey}`,
  }),
});

export default replicaSetMetricsInjectable;
