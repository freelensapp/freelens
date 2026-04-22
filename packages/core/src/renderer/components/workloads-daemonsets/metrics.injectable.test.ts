/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForDaemonSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-daemon-sets.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import daemonSetMetricsInjectable from "./metrics.injectable";

import type { DaemonSet } from "@freelensapp/kube-object";

describe("daemon-set-metrics injectable", () => {
  it("requests daemon set pod metrics with selected time range and range-aware keying", () => {
    const di = getDiForUnitTesting();
    const requestPodMetricsForDaemonSets = jest.fn().mockResolvedValue({});
    const daemonSet = {
      getId: () => "daemon-set-id",
      getName: () => "daemon-set-name",
      getNs: () => "daemon-set-ns",
    } as unknown as DaemonSet;

    di.override(requestPodMetricsForDaemonSetsInjectable, () => requestPodMetricsForDaemonSets);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 5000, end: 5100, range: 100 }),
      },
    }));

    const metricsA = di.inject(daemonSetMetricsInjectable, {
      daemonSet,
      timeRangeKey: "custom-5000-5100",
    });
    const metricsB = di.inject(daemonSetMetricsInjectable, {
      daemonSet,
      timeRangeKey: "custom-5200-5300",
    });

    metricsA.value.get();

    expect(requestPodMetricsForDaemonSets).toHaveBeenCalledWith([daemonSet], "daemon-set-ns", undefined, {
      start: 5000,
      end: 5100,
      range: 100,
    });
    expect(metricsB).not.toBe(metricsA);
  });
});
