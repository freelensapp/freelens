/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";
import { Secret } from "@freelens/kube-object";
import type { SecretData } from "@freelens/kube-object";

export class SecretApi extends KubeApi<Secret, SecretData> {
  constructor(deps: KubeApiDependencies, options: DerivedKubeApiOptions = {}) {
    super(deps, {
      ...options,
      objectConstructor: Secret,
    });
  }
}
