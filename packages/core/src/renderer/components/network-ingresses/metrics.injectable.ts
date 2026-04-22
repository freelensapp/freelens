/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestIngressMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-ingress-metrics.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Ingress } from "@freelensapp/kube-object";

interface IngressMetricsInjectableParams {
  ingress: Ingress;
  timeRangeKey: string;
}

const ingressMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "ingress-metrics",
  getObject: ({ ingress }: IngressMetricsInjectableParams) => ingress,
  getObjectId: (ingress) => ingress.getId(),
  request: ({ di, object: ingress, start, end, range }) =>
    di.inject(requestIngressMetricsInjectable)(ingress.getName(), ingress.getNs(), {
      start,
      end,
      range,
    }),
});

export default ingressMetricsInjectable;
