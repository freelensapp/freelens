/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RuntimeClassData } from "@freelensapp/kube-object";
import { RuntimeClass } from "@freelensapp/kube-object";
import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";

export class RuntimeClassApi extends KubeApi<RuntimeClass, RuntimeClassData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      objectConstructor: RuntimeClass,
      ...opts,
    });
  }
}
