import assert from "assert";
import { namespaceApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import selectedNamespacesStorageInjectable from "../../../features/namespace-filtering/renderer/storage.injectable";
import clusterFrameContextForClusterScopedResourcesInjectable from "../../cluster-frame-context/for-cluster-scoped-resources.injectable";
import clusterConfiguredAccessibleNamespacesInjectable from "../../cluster/accessible-namespaces.injectable";
import { NamespaceStore } from "./store";

const namespaceStoreInjectable = getInjectable({
  id: "namespace-store",

  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "namespaceStore is only available in certain environments",
    );

    const api = di.inject(namespaceApiInjectable);

    return new NamespaceStore(
      {
        context: di.inject(clusterFrameContextForClusterScopedResourcesInjectable),
        storage: di.inject(selectedNamespacesStorageInjectable),
        clusterConfiguredAccessibleNamespaces: di.inject(clusterConfiguredAccessibleNamespacesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default namespaceStoreInjectable;
