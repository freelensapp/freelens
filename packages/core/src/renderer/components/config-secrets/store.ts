/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import type { SecretApi } from "@freelens/kube-api";
import type { Secret, SecretData } from "@freelens/kube-object";

export class SecretStore extends KubeObjectStore<Secret, SecretApi, SecretData> {
}
