/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";

import type { StorageClassApi } from "@freelensapp/kube-api";
import type { StorageClass, StorageClassData } from "@freelensapp/kube-object";

import type { KubeObjectStoreDependencies, KubeObjectStoreOptions } from "../../../common/k8s-api/kube-object.store";
import type { GetPersistentVolumesByStorageClass } from "../storage-volumes/get-persistent-volumes-by-storage-class.injectable";

export interface StorageClassStoreDependencies extends KubeObjectStoreDependencies {
  getPersistentVolumesByStorageClass: GetPersistentVolumesByStorageClass;
}

export class StorageClassStore extends KubeObjectStore<StorageClass, StorageClassApi, StorageClassData> {
  constructor(
    protected readonly dependencies: StorageClassStoreDependencies,
    api: StorageClassApi,
    opts?: KubeObjectStoreOptions,
  ) {
    super(dependencies, api, opts);
  }

  getPersistentVolumes(storageClass: StorageClass) {
    return this.dependencies.getPersistentVolumesByStorageClass(storageClass);
  }
}
