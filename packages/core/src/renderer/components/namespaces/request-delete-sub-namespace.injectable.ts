/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Namespace } from "@freelensapp/kube-object";
import { waitUntilDefined } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import apiManagerInjectable from "../../../common/k8s-api/api-manager/manager.injectable";
import customResourceDefinitionStoreInjectable from "../custom-resource-definitions/store.injectable";

export type RequestDeleteSubNamespaceAnchor = (namespace: Namespace) => Promise<void>;

const requestDeleteSubNamespaceAnchorInjectable = getInjectable({
  id: "request-delete-sub-namespace-anchor",
  instantiate: (di): RequestDeleteSubNamespaceAnchor => {
    const crdStore = di.inject(customResourceDefinitionStoreInjectable);
    const apiManager = di.inject(apiManagerInjectable);

    return async (namespace) => {
      const anchorCrd = await waitUntilDefined(() => crdStore.getByGroup("hnc.x-k8s.io", "subnamespaceanchors"));
      const anchorApi = apiManager.getApi(anchorCrd.getResourceApiBase());

      await anchorApi?.delete({ name: namespace.getName() });
    };
  },
});

export default requestDeleteSubNamespaceAnchorInjectable;
