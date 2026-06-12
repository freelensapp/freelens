/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type { KubeJsonApiData, KubeObjectMetadata, KubeObjectScope, NamespaceScopedMetadata } from "../api-types";

export interface NodeMetricsData extends KubeJsonApiData<KubeObjectMetadata<KubeObjectScope.Namespace>, void, void> {
  timestamp: string;
  window: string;
  usage: NodeMetricsUsage;
}

export interface NodeMetricsUsage {
  cpu: string;
  memory: string;
}

export class NodeMetrics extends KubeObject<NamespaceScopedMetadata, void, void> {
  static readonly kind = "NodeMetrics";

  static readonly namespaced = true;

  static readonly apiBase = "/apis/metrics.k8s.io/v1beta1/nodes";

  timestamp: string;

  window: string;

  usage: NodeMetricsUsage;

  constructor({ timestamp, window, usage, ...rest }: NodeMetricsData) {
    super(rest);
    this.timestamp = timestamp;
    this.window = window;
    this.usage = usage;
  }
}
