/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeEvent } from "@freelensapp/kube-object";
import { KubeApi } from "../kube-api";

import type { KubeEventData } from "@freelensapp/kube-object";

import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";

export class KubeEventApi extends KubeApi<KubeEvent, KubeEventData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      objectConstructor: KubeEvent,
      ...opts,
    });
  }
}
