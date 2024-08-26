/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeEventData } from "@freelensapp/kube-object";
import { KubeEvent } from "@freelensapp/kube-object";
import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";

export class KubeEventApi extends KubeApi<KubeEvent, KubeEventData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      objectConstructor: KubeEvent,
      ...opts,
    });
  }
}
