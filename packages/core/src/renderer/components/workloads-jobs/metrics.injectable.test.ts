/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForJobsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-jobs.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import jobMetricsInjectable from "./metrics.injectable";

import type { Job } from "@freelensapp/kube-object";

describe("job-metrics injectable", () => {
  it("requests job pod metrics with the selected time range", () => {
    const di = getDiForUnitTesting();
    const requestPodMetricsForJobs = jest.fn().mockResolvedValue({});
    const job = {
      getId: () => "job-id",
      getName: () => "job-name",
      getNs: () => "job-ns",
    } as unknown as Job;

    di.override(requestPodMetricsForJobsInjectable, () => requestPodMetricsForJobs);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 4000, end: 4100, range: 100 }),
      },
    }));

    const metrics = di.inject(jobMetricsInjectable, { job });

    metrics.value.get();

    expect(requestPodMetricsForJobs).toHaveBeenCalledWith([job], "job-ns", undefined, {
      start: 4000,
      end: 4100,
      range: 100,
    });
  });
});
