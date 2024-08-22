/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { PriorityClassApi } from "@freelens/kube-api";
import type { PriorityClass } from "@freelens/kube-object";

export class PriorityClassStore extends KubeObjectStore<PriorityClass, PriorityClassApi> {
}
