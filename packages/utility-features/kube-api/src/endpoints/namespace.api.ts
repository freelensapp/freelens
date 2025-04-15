/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Namespace } from "@freelensapp/kube-object";
import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";

export class NamespaceApi extends KubeApi<Namespace> {
  constructor(deps: KubeApiDependencies, opts?: DerivedKubeApiOptions) {
    super(deps, {
      ...(opts ?? {}),
      objectConstructor: Namespace,
    });
  }
}
