/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Secret } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { SecretData } from "@freelensapp/kube-object";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class SecretApi extends KubeApi<Secret, SecretData> {
  constructor(deps: KubeApiDependencies, options: DerivedKubeApiOptions = {}) {
    super(deps, {
      ...options,
      objectConstructor: Secret,
    });
  }
}
