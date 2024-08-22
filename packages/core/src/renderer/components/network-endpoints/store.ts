/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Endpoints, EndpointsData } from "@freelens/kube-object";
import type { EndpointsApi } from "@freelens/kube-api";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class EndpointsStore extends KubeObjectStore<Endpoints, EndpointsApi, EndpointsData> {
}
