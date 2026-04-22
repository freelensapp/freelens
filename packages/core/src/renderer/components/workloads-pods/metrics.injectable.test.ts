/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import podMetricsInjectable from "./metrics.injectable";

import type { Pod } from "@freelensapp/kube-object";

describe("pod-metrics injectable", () => {
  it("requests pod metrics with selected time range and range-aware keying", () => {
    const di = getDiForUnitTesting();
    const requestPodMetrics = jest.fn().mockResolvedValue({});
    const pod = {
      getId: () => "pod-id",
      getName: () => "pod-name",
      getNs: () => "pod-ns",
    } as unknown as Pod;

    di.override(requestPodMetricsInjectable, () => requestPodMetrics);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 100, end: 200, range: 100 }),
      },
    }));

    const metricsA = di.inject(podMetricsInjectable, {
      pod,
      timeRangeKey: "custom-100-200",
    });
    const metricsB = di.inject(podMetricsInjectable, {
      pod,
      timeRangeKey: "custom-300-400",
    });

    metricsA.value.get();

    expect(requestPodMetrics).toHaveBeenCalledWith([pod], "pod-ns", undefined, "pod, namespace", {
      start: 100,
      end: 200,
      range: 100,
      metrics: ["cpuUsage", "memoryUsage", "fsUsage", "fsWrites", "fsReads", "networkReceive", "networkTransmit"],
    });
    expect(metricsB).not.toBe(metricsA);
  });
});
