/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Namespace } from "@freelensapp/kube-object";
import { getInjectable } from "@ogre-tools/injectable";
import requestDeleteNormalNamespaceInjectable from "./request-delete-normal-namespace.injectable";
import requestDeleteSubNamespaceAnchorInjectable from "./request-delete-sub-namespace.injectable";

export type RequestDeleteNamespace = (namespace: Namespace) => Promise<void>;

const requestDeleteNamespaceInjectable = getInjectable({
  id: "request-delete-namespace",
  instantiate: (di): RequestDeleteNamespace => {
    const requestDeleteSubNamespaceAnchor = di.inject(requestDeleteSubNamespaceAnchorInjectable);
    const requestDeleteNormalNamespace = di.inject(requestDeleteNormalNamespaceInjectable);

    return async (namespace) => {
      if (namespace.isSubnamespace()) {
        await requestDeleteSubNamespaceAnchor(namespace);
      }

      await requestDeleteNormalNamespace(namespace);
    };
  },
});

export default requestDeleteNamespaceInjectable;
