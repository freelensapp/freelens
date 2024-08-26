/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { DerivedKubeApiOptions, KubeApiDependencies } from "../kube-api";
import { KubeApi } from "../kube-api";
import type { ClusterRoleBindingData } from "@freelensapp/kube-object";
import { ClusterRoleBinding } from "@freelensapp/kube-object";

export class ClusterRoleBindingApi extends KubeApi<ClusterRoleBinding, ClusterRoleBindingData> {
  constructor(deps: KubeApiDependencies, opts: DerivedKubeApiOptions = {}) {
    super(deps, {
      ...opts,
      objectConstructor: ClusterRoleBinding,
    });
  }
}
