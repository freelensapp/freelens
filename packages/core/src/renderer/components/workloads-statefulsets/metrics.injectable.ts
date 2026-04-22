/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForStatefulSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-stateful-sets.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { StatefulSet } from "@freelensapp/kube-object";

interface StatefulSetMetricsInjectableParams {
  statefulSet: StatefulSet;
  timeRangeKey: string;
}

const statefulSetMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "stateful-set-metrics",
  getObject: ({ statefulSet }: StatefulSetMetricsInjectableParams) => statefulSet,
  getObjectId: (statefulSet) => statefulSet.getId(),
  request: ({ di, object: statefulSet, start, end, range }) =>
    di.inject(requestPodMetricsForStatefulSetsInjectable)([statefulSet], statefulSet.getNs(), undefined, {
      start,
      end,
      range,
    }),
});

export default statefulSetMetricsInjectable;
