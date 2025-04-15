/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Namespace } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import namespaceStoreInjectable from "./store.injectable";

export type RequestDeleteNormalNamespace = (namespace: Namespace) => Promise<void>;

const requestDeleteNormalNamespaceInjectable = getInjectable({
  id: "request-delete-normal-namespace",
  instantiate: (di): RequestDeleteNormalNamespace => {
    const namespaceStore = di.inject(namespaceStoreInjectable);

    return (namespace) => namespaceStore.remove(namespace);
  },
});

export default requestDeleteNormalNamespaceInjectable;
