/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPersistentVolumeClaimMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-persistent-volume-claim-metrics.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

interface PersistentVolumeClaimMetricsInjectableParams {
  persistentVolumeClaim: PersistentVolumeClaim;
  timeRangeKey: string;
}

const persistentVolumeClaimMetricsInjectable = getInjectable({
  id: "persistent-volume-claim-metrics",
  instantiate: (di, { persistentVolumeClaim }: PersistentVolumeClaimMetricsInjectableParams) => {
    const requestPersistentVolumeClaimMetrics = di.inject(requestPersistentVolumeClaimMetricsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000); // update every minute
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestPersistentVolumeClaimMetrics(persistentVolumeClaim, {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { persistentVolumeClaim, timeRangeKey }: PersistentVolumeClaimMetricsInjectableParams) =>
      `${persistentVolumeClaim.getId()}-${timeRangeKey}`,
  }),
});

export default persistentVolumeClaimMetricsInjectable;
