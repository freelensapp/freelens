/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsInNamespaceInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-in-namespace.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import namespaceMetricsInjectable from "./metrics.injectable";

import type { Namespace } from "@freelensapp/kube-object";

describe("namespace-metrics injectable", () => {
  it("requests namespace pod metrics with selected time range and range-aware keying", () => {
    const di = getDiForUnitTesting();
    const requestPodMetricsInNamespace = jest.fn().mockResolvedValue({});
    const namespace = {
      getId: () => "namespace-id",
      getName: () => "namespace-name",
      getNs: () => "namespace-name",
    } as unknown as Namespace;

    di.override(requestPodMetricsInNamespaceInjectable, () => requestPodMetricsInNamespace);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 6000, end: 6100, range: 100 }),
      },
    }));

    const metricsA = di.inject(namespaceMetricsInjectable, {
      namespace,
      timeRangeKey: "custom-6000-6100",
    });
    const metricsB = di.inject(namespaceMetricsInjectable, {
      namespace,
      timeRangeKey: "custom-6200-6300",
    });

    metricsA.value.get();

    expect(requestPodMetricsInNamespace).toHaveBeenCalledWith("namespace-name", undefined, {
      start: 6000,
      end: 6100,
      range: 100,
    });
    expect(metricsB).not.toBe(metricsA);
  });
});
