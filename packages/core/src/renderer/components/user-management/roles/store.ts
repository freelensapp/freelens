/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../../common/k8s-api/kube-object.store";

import type { RoleApi } from "@freelensapp/kube-api";
import type { Role, RoleData } from "@freelensapp/kube-object";

export class RoleStore extends KubeObjectStore<Role, RoleApi, RoleData> {
  protected sortItems(items: Role[]) {
    return super.sortItems(items, [(role) => role.kind, (role) => role.getName()]);
  }
}
