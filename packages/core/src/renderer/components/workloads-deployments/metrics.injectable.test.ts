/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForDeploymentsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-deployments.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import deploymentMetricsInjectable from "./metrics.injectable";

import type { Deployment } from "@freelensapp/kube-object";

describe("deployment-metrics injectable", () => {
  it("requests deployment pod metrics with the selected time range", () => {
    const di = getDiForUnitTesting();
    const requestPodMetricsForDeployments = jest.fn().mockResolvedValue({});
    const deployment = {
      getId: () => "deployment-id",
      getName: () => "deployment-name",
      getNs: () => "deployment-ns",
    } as unknown as Deployment;

    di.override(requestPodMetricsForDeploymentsInjectable, () => requestPodMetricsForDeployments);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 1000, end: 1100, range: 100 }),
      },
    }));

    const metrics = di.inject(deploymentMetricsInjectable, { deployment });

    metrics.value.get();

    expect(requestPodMetricsForDeployments).toHaveBeenCalledWith([deployment], "deployment-ns", undefined, {
      start: 1000,
      end: 1100,
      range: 100,
    });
  });
});
