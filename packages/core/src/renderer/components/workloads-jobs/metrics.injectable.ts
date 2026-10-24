/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForJobsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-jobs.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Job } from "@freelensapp/kube-object";

interface JobMetricsInjectableParams {
  job: Job;
}

const jobMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "job-metrics",
  getObject: ({ job }: JobMetricsInjectableParams) => job,
  getObjectId: (job) => job.getId(),
  request: ({ di, object: job, start, end, range }) =>
    di.inject(requestPodMetricsForJobsInjectable)([job], job.getNs(), undefined, {
      start,
      end,
      range,
    }),
});

export default jobMetricsInjectable;
