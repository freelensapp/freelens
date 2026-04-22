/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { asyncComputed } from "@ogre-tools/injectable-react";
import { now } from "mobx-utils";
import requestPodMetricsForJobsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-jobs.injectable";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";

import type { Job } from "@freelensapp/kube-object";

interface JobMetricsInjectableParams {
  job: Job;
  timeRangeKey: string;
}

const jobMetricsInjectable = getInjectable({
  id: "job-metrics",
  instantiate: (di, { job }: JobMetricsInjectableParams) => {
    const requestPodMetricsForJobs = di.inject(requestPodMetricsForJobsInjectable);
    const selectedMetricsTimeRange = di.inject(selectedMetricsTimeRangeInjectable);

    return asyncComputed({
      getValueFromObservedPromise: () => {
        now(60 * 1000);
        const { start, end, range } = selectedMetricsTimeRange.timestamps.get();

        return requestPodMetricsForJobs([job], job.getNs(), undefined, {
          start,
          end,
          range,
        });
      },
      betweenUpdates: "show-latest-value",
    });
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, { job, timeRangeKey }: JobMetricsInjectableParams) => `${job.getId()}-${timeRangeKey}`,
  }),
});

export default jobMetricsInjectable;
