/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { PersistentVolumeApi } from "@freelensapp/kube-api";
import type { PersistentVolume, StorageClass } from "@freelensapp/kube-object";

export class PersistentVolumeStore extends KubeObjectStore<PersistentVolume, PersistentVolumeApi> {
  getByStorageClass(storageClass: StorageClass): PersistentVolume[] {
    const storageClassName = storageClass.getName();

    return this.items.filter((volume) => volume.getStorageClassName() === storageClassName);
  }
}
