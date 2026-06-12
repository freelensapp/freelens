/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import podStoreInjectable from "./store.injectable";

import type { Pod } from "@freelensapp/kube-object";

export type GetPodsByOwnerId = (ownerId: string) => Pod[];

const getPodsByOwnerIdInjectable = getInjectable({
  id: "get-pods-by-owner-id",
  instantiate: (di): GetPodsByOwnerId => {
    const podStore = di.inject(podStoreInjectable);

    return (ownerId) => podStore.getPodsByOwnerId(ownerId);
  },
});

export default getPodsByOwnerIdInjectable;
