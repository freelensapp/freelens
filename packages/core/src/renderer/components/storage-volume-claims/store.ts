/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { PersistentVolumeClaimApi } from "@freelensapp/kube-api";
import type { PersistentVolumeClaim } from "@freelensapp/kube-object";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

export class PersistentVolumeClaimStore extends KubeObjectStore<PersistentVolumeClaim, PersistentVolumeClaimApi> {}
