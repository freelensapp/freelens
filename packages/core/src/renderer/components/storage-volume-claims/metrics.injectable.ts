/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPersistentVolumeClaimMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-persistent-volume-claim-metrics.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

interface PersistentVolumeClaimMetricsInjectableParams {
  persistentVolumeClaim: PersistentVolumeClaim;
  timeRangeKey: string;
}

const persistentVolumeClaimMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "persistent-volume-claim-metrics",
  getObject: ({ persistentVolumeClaim }: PersistentVolumeClaimMetricsInjectableParams) => persistentVolumeClaim,
  getObjectId: (persistentVolumeClaim) => persistentVolumeClaim.getId(),
  request: ({ di, object: persistentVolumeClaim, start, end, range }) =>
    di.inject(requestPersistentVolumeClaimMetricsInjectable)(persistentVolumeClaim, {
      start,
      end,
      range,
    }),
});

export default persistentVolumeClaimMetricsInjectable;
