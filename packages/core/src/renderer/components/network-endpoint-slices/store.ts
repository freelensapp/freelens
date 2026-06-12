/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { EndpointSliceApi } from "@freelensapp/kube-api";
import type { EndpointSlice, EndpointSliceData } from "@freelensapp/kube-object";

export class EndpointSliceStore extends KubeObjectStore<EndpointSlice, EndpointSliceApi, EndpointSliceData> {}
