/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "../kube-object";

import type {
  ClusterScopedMetadata,
  KubeJsonApiData,
  KubeObjectMetadata,
  KubeObjectScope,
  Toleration,
} from "../api-types";

export interface RuntimeClassData extends KubeJsonApiData<KubeObjectMetadata<KubeObjectScope.Cluster>, void, void> {
  handler: string;
  overhead?: RuntimeClassOverhead;
  scheduling?: RuntimeClassScheduling;
}

export interface RuntimeClassOverhead {
  /** The resources that a pod of the class uses on top of its containers, as `{ cpu: "250m", memory: "160Mi" }`. */
  podFixed?: Partial<Record<string, string>>;
}

export interface RuntimeClassScheduling {
  nodeSelector?: Partial<Record<string, string>>;
  tolerations?: Toleration[];
}

export class RuntimeClass extends KubeObject<ClusterScopedMetadata, void, void> {
  static readonly kind = "RuntimeClass";

  static readonly namespaced = false;

  static readonly apiBase = "/apis/node.k8s.io/v1/runtimeclasses";

  handler: string;

  overhead?: RuntimeClassOverhead;

  scheduling?: RuntimeClassScheduling;

  constructor({ handler, overhead, scheduling, ...rest }: RuntimeClassData) {
    super(rest);
    this.handler = handler;
    this.overhead = overhead;
    this.scheduling = scheduling;
  }

  getHandler() {
    return this.handler;
  }

  /** The fixed overhead of a pod, as `cpu: 250m, memory: 160Mi`, or an empty string when the class has none. */
  getPodFixed() {
    return Object.entries(this.overhead?.podFixed ?? {})
      .filter(([, quantity]) => quantity !== undefined)
      .map(([resource, quantity]) => `${resource}: ${quantity}`)
      .join(", ");
  }

  getNodeSelectors(): string[] {
    return Object.entries(this.scheduling?.nodeSelector ?? {}).map((values) => values.join(": "));
  }

  getTolerations() {
    return this.scheduling?.tolerations ?? [];
  }
}
