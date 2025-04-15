/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LimitRangeApi } from "@freelensapp/kube-api";
import type { LimitRange } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class LimitRangeStore extends KubeObjectStore<LimitRange, LimitRangeApi> {}
