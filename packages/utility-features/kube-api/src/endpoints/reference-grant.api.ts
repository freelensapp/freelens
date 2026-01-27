/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ReferenceGrant } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class ReferenceGrantApi extends KubeApi<ReferenceGrant> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: ReferenceGrant,
      checkPreferredVersion: true,
      fallbackApiBases: ["/apis/gateway.networking.k8s.io/v1alpha2/referencegrants"],
    });
  }
}
