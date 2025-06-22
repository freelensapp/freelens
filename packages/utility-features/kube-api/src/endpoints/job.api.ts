/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Job } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies, NamespacedResourceDescriptor } from "../kube-api";

export class JobApi extends KubeApi<Job> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: Job,
    });
  }

  private requestSetSuspend(params: NamespacedResourceDescriptor, suspend: boolean) {
    return this.patch(
      params,
      {
        spec: {
          suspend,
        },
      },
      "strategic",
    );
  }

  suspend(params: NamespacedResourceDescriptor) {
    return this.requestSetSuspend(params, true);
  }

  resume(params: NamespacedResourceDescriptor) {
    return this.requestSetSuspend(params, false);
  }
}
