/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { StorageClass } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { StorageClassData } from "@freelensapp/kube-object";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class StorageClassApi extends KubeApi<StorageClass, StorageClassData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      ...opts,
      objectConstructor: StorageClass,
    });
  }
}
