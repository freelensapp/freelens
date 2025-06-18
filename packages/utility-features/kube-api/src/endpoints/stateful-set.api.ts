/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { StatefulSet } from "@freelensapp/kube-object";
import moment from "moment";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies, NamespacedResourceDescriptor } from "../kube-api";

export class StatefulSetApi extends KubeApi<StatefulSet> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: StatefulSet,
    });
  }

  async getReplicas(params: NamespacedResourceDescriptor): Promise<number> {
    const { status } = await this.getResourceScale(params);

    return status.replicas;
  }

  scale(params: NamespacedResourceDescriptor, replicas: number) {
    return this.scaleResource(params, { spec: { replicas } });
  }

  restart(params: NamespacedResourceDescriptor) {
    return this.patch(
      params,
      {
        spec: {
          template: {
            metadata: {
              annotations: { "kubectl.kubernetes.io/restartedAt": moment.utc().format() },
            },
          },
        },
      },
      "strategic",
    );
  }
}
