/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ConfigMapApi } from "@freelensapp/kube-api";
import type { ConfigMap, ConfigMapData } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class ConfigMapStore extends KubeObjectStore<ConfigMap, ConfigMapApi, ConfigMapData> {}
