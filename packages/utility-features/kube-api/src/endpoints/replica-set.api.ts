/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ReplicaSet } from "@freelensapp/kube-object";
import type { DerivedKubeApiOptions, KubeApiDependencies, NamespacedResourceDescriptor } from "../kube-api";
import { KubeApi } from "../kube-api";

export class ReplicaSetApi extends KubeApi<ReplicaSet> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: ReplicaSet,
    });
  }

  async getReplicas(params: NamespacedResourceDescriptor): Promise<number> {
    const { status } = await this.getResourceScale(params);

    return status.replicas;
  }

  scale(params: NamespacedResourceDescriptor, replicas: number) {
    return this.scaleResource(params, { spec: { replicas } });
  }
}
