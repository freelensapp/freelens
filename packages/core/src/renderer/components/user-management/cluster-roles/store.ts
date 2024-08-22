/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { ClusterRole, ClusterRoleData } from "@freelens/kube-object";
import type { ClusterRoleApi } from "@freelens/kube-api";
import { KubeObjectStore } from "../../../../common/k8s-api/kube-object.store";

export class ClusterRoleStore extends KubeObjectStore<ClusterRole, ClusterRoleApi, ClusterRoleData> {
  protected sortItems(items: ClusterRole[]) {
    return super.sortItems(items, [
      clusterRole => clusterRole.kind,
      clusterRole => clusterRole.getName(),
    ]);
  }
}
