/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import moment from "moment";

import { Deployment } from "@freelensapp/kube-object";
import type { DerivedKubeApiOptions, KubeApiDependencies, NamespacedResourceDescriptor } from "../kube-api";
import { KubeApi } from "../kube-api";

export class DeploymentApi extends KubeApi<Deployment> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: Deployment,
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
