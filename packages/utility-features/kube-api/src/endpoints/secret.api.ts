/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";
import { Secret } from "@freelensapp/kube-object";
import type { SecretData } from "@freelensapp/kube-object";

export class SecretApi extends KubeApi<Secret, SecretData> {
  constructor(deps: KubeApiDependencies, options: DerivedKubeApiOptions = {}) {
    super(deps, {
      ...options,
      objectConstructor: Secret,
    });
  }
}
