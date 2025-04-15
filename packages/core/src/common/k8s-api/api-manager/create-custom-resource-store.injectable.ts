import type { KubeApi } from "@freelensapp/kube-api";
import type { KubeObject } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import clusterFrameContextForNamespacedResourcesInjectable from "../../../renderer/cluster-frame-context/for-namespaced-resources.injectable";
import type { KubeObjectStoreDependencies } from "../kube-object.store";
import { CustomResourceStore } from "./resource.store";

export type CreateCustomResourceStore = <K extends KubeObject>(api: KubeApi<K>) => CustomResourceStore<K>;

const createCustomResourceStoreInjectable = getInjectable({
  id: "create-custom-resource-store",
  instantiate: (di): CreateCustomResourceStore => {
    const deps: KubeObjectStoreDependencies = {
      context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
      logger: di.inject(loggerInjectionToken),
    };

    return (api) => new CustomResourceStore(deps, api);
  },
});

export default createCustomResourceStoreInjectable;
