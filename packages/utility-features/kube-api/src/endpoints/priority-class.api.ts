/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";
import type { PriorityClassData } from "@freelensapp/kube-object";
import { PriorityClass } from "@freelensapp/kube-object";

export class PriorityClassApi extends KubeApi<PriorityClass, PriorityClassData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      objectConstructor: PriorityClass,
      ...opts,
    });
  }
}
