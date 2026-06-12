/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../../common/k8s-api/kube-object.store";

import type { ClusterRoleApi } from "@freelensapp/kube-api";
import type { ClusterRole, ClusterRoleData } from "@freelensapp/kube-object";

export class ClusterRoleStore extends KubeObjectStore<ClusterRole, ClusterRoleApi, ClusterRoleData> {
  protected sortItems(items: ClusterRole[]) {
    return super.sortItems(items, [(clusterRole) => clusterRole.kind, (clusterRole) => clusterRole.getName()]);
  }
}
