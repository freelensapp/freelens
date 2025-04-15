/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { SecretApi } from "@freelensapp/kube-api";
import type { Secret, SecretData } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class SecretStore extends KubeObjectStore<Secret, SecretApi, SecretData> {}
