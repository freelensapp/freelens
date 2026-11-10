/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestMetricsInjectable from "./request-metrics.injectable";

import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

import type { MetricData } from "../metrics.api";
import type { RequestMetricsParams } from "./request-metrics.injectable";

export interface PersistentVolumeClaimMetricData {
  diskUsage: MetricData;
  diskCapacity: MetricData;
}

export type RequestPersistentVolumeClaimMetrics = (
  claim: PersistentVolumeClaim,
  params?: RequestMetricsParams,
) => Promise<PersistentVolumeClaimMetricData>;

const requestPersistentVolumeClaimMetricsInjectable = getInjectable({
  id: "request-persistent-volume-claim-metrics",
  instantiate: (di): RequestPersistentVolumeClaimMetrics => {
    const requestMetrics = di.inject(requestMetricsInjectable);

    return (claim, params = {}) => {
      const opts = { category: "pvc", pvc: claim.getName(), namespace: claim.getNs() };

      return requestMetrics(
        {
          diskUsage: opts,
          diskCapacity: opts,
        },
        {
          namespace: opts.namespace,
          ...params,
        },
      );
    };
  },
});

export default requestPersistentVolumeClaimMetricsInjectable;
