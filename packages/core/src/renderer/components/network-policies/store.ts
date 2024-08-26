/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { NetworkPolicyApi } from "@freelensapp/kube-api";
import type { NetworkPolicy } from "@freelensapp/kube-object";

export class NetworkPolicyStore extends KubeObjectStore<NetworkPolicy, NetworkPolicyApi> {
}
