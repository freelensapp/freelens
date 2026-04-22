/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPersistentVolumeClaimMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-persistent-volume-claim-metrics.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import persistentVolumeClaimMetricsInjectable from "./metrics.injectable";

import type { PersistentVolumeClaim } from "@freelensapp/kube-object";

describe("persistent-volume-claim-metrics injectable", () => {
  it("requests pvc metrics with the selected time range", () => {
    const di = getDiForUnitTesting();
    const requestPersistentVolumeClaimMetrics = jest.fn().mockResolvedValue({});
    const persistentVolumeClaim = {
      getId: () => "pvc-id",
      getName: () => "pvc-name",
      getNs: () => "pvc-ns",
    } as unknown as PersistentVolumeClaim;

    di.override(requestPersistentVolumeClaimMetricsInjectable, () => requestPersistentVolumeClaimMetrics);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 1_700_000_000, end: 1_700_000_600, range: 600 }),
      },
    }));

    const metrics = di.inject(persistentVolumeClaimMetricsInjectable, {
      persistentVolumeClaim,
    });

    metrics.value.get();

    expect(requestPersistentVolumeClaimMetrics).toHaveBeenCalledWith(persistentVolumeClaim, {
      start: 1_700_000_000,
      end: 1_700_000_600,
      range: 600,
    });
  });
});
