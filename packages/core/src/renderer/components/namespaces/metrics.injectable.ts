/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsInNamespaceInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Namespace } from "@freelensapp/kube-object";

interface NamespaceMetricsInjectableParams {
  namespace: Namespace;
}

const namespaceMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "namespace-metrics",
  getObject: ({ namespace }: NamespaceMetricsInjectableParams) => namespace,
  getObjectId: (namespace) => namespace.getId(),
  request: ({ di, object: namespace, start, end, range }) =>
    di.inject(requestPodMetricsInNamespaceInjectable)(namespace.getName(), undefined, {
      start,
      end,
      range,
    }),
});

export default namespaceMetricsInjectable;
