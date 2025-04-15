/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { PodDisruptionBudgetApi } from "@freelensapp/kube-api";
import type { PodDisruptionBudget } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class PodDisruptionBudgetStore extends KubeObjectStore<PodDisruptionBudget, PodDisruptionBudgetApi> {}
