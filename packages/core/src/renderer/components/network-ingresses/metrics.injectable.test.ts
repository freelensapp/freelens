/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestIngressMetricsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-ingress-metrics.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import ingressMetricsInjectable from "./metrics.injectable";

import type { Ingress } from "@freelensapp/kube-object";

describe("ingress-metrics injectable", () => {
  it("requests ingress metrics with the selected time range", () => {
    const di = getDiForUnitTesting();
    const requestIngressMetrics = jest.fn().mockResolvedValue({});
    const ingress = {
      getId: () => "ingress-id",
      getName: () => "ingress-name",
      getNs: () => "ingress-ns",
    } as unknown as Ingress;

    di.override(requestIngressMetricsInjectable, () => requestIngressMetrics);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 1_700_000_000, end: 1_700_000_600, range: 600 }),
      },
    }));

    const metrics = di.inject(ingressMetricsInjectable, {
      ingress,
      timeRangeKey: "duration-600",
    });

    metrics.value.get();

    expect(requestIngressMetrics).toHaveBeenCalledWith("ingress-name", "ingress-ns", {
      start: 1_700_000_000,
      end: 1_700_000_600,
      range: 600,
    });
  });
});
