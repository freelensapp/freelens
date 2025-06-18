/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { PodMetrics } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { PodMetricsData } from "@freelensapp/kube-object";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class PodMetricsApi extends KubeApi<PodMetrics, PodMetricsData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      ...opts,
      objectConstructor: PodMetrics,
    });
  }
}
