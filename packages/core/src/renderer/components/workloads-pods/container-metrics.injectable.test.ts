/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import podContainerMetricsInjectable from "./container-metrics.injectable";

import type { Container, Pod } from "@freelensapp/kube-object";

describe("pod-container-metrics injectable", () => {
  it("requests container metrics and keys instances by pod and container name", () => {
    const di = getDiForUnitTesting();
    const requestPodMetrics = jest.fn().mockResolvedValue({});
    const pod = {
      getId: () => "pod-id",
      getName: () => "pod-name",
      getNs: () => "pod-ns",
    } as unknown as Pod;
    const firstContainer = {
      name: "container-a",
    } as Container;
    const secondContainer = {
      name: "container-b",
    } as Container;

    di.override(requestPodMetricsInjectable, () => requestPodMetrics);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 100, end: 200, range: 100 }),
      },
    }));

    const metricsForFirstContainer = di.inject(podContainerMetricsInjectable, {
      pod,
      container: firstContainer,
      timeRangeKey: "custom-100-200",
    });
    const metricsForSecondContainer = di.inject(podContainerMetricsInjectable, {
      pod,
      container: secondContainer,
      timeRangeKey: "custom-100-200",
    });

    metricsForFirstContainer.value.get();

    expect(requestPodMetrics).toHaveBeenCalledWith([pod], "pod-ns", firstContainer, "pod, container, namespace", {
      start: 100,
      end: 200,
      range: 100,
      metrics: [
        "cpuUsage",
        "cpuRequests",
        "cpuLimits",
        "memoryUsage",
        "memoryRequests",
        "memoryLimits",
        "fsUsage",
        "fsWrites",
        "fsReads",
      ],
    });
    expect(metricsForSecondContainer).not.toBe(metricsForFirstContainer);
  });
});
