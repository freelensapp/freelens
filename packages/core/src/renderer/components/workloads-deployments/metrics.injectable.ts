/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForDeploymentsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-deployments.injectable";
import { createTimeRangedMetricsInjectable } from "../resource-metrics/create-time-ranged-metrics";

import type { Deployment } from "@freelensapp/kube-object";

interface DeploymentMetricsInjectableParams {
  deployment: Deployment;
  timeRangeKey: string;
}

const deploymentMetricsInjectable = createTimeRangedMetricsInjectable({
  id: "deployment-metrics",
  getObject: ({ deployment }: DeploymentMetricsInjectableParams) => deployment,
  getObjectId: (deployment) => deployment.getId(),
  request: ({ di, object: deployment, start, end, range }) =>
    di.inject(requestPodMetricsForDeploymentsInjectable)([deployment], deployment.getNs(), undefined, {
      start,
      end,
      range,
    }),
});

export default deploymentMetricsInjectable;
