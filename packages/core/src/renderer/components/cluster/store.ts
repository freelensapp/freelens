/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { ClusterApi } from "@freelensapp/kube-api";
import type { Cluster } from "@freelensapp/kube-object";

export class ClusterStore extends KubeObjectStore<Cluster, ClusterApi> {
}
