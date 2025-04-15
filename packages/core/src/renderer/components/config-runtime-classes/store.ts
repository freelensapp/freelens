/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RuntimeClassApi } from "@freelensapp/kube-api";
import type { RuntimeClass } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class RuntimeClassStore extends KubeObjectStore<RuntimeClass, RuntimeClassApi> {}
