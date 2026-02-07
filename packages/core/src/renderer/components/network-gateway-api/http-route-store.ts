/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { HTTPRouteApi } from "@freelensapp/kube-api";
import type { HTTPRoute } from "@freelensapp/kube-object";

export class HTTPRouteStore extends KubeObjectStore<HTTPRoute, HTTPRouteApi> {}
