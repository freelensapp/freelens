import type { IngressClassApi } from "@freelensapp/kube-api";
import type { IngressClass } from "@freelensapp/kube-object";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class IngressClassStore extends KubeObjectStore<IngressClass, IngressClassApi> {}
