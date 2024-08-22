/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { PodSecurityPolicy } from "@freelens/kube-object";
import type { PodSecurityPolicyApi } from "@freelens/kube-api";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class PodSecurityPolicyStore extends KubeObjectStore<PodSecurityPolicy, PodSecurityPolicyApi> {
}
