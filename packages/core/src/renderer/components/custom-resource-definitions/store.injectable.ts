/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "assert";
import {
  customResourceDefinitionApiInjectable,
  storesAndApisCanBeCreatedInjectionToken,
} from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForClusterScopedResourcesInjectable from "../../cluster-frame-context/for-cluster-scoped-resources.injectable";
import { CustomResourceDefinitionStore } from "./store";

const customResourceDefinitionStoreInjectable = getInjectable({
  id: "custom-resource-definition-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "customResourceDefinitionStore is only available in certain environments",
    );

    const api = di.inject(customResourceDefinitionApiInjectable);

    return new CustomResourceDefinitionStore(
      {
        context: di.inject(clusterFrameContextForClusterScopedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default customResourceDefinitionStoreInjectable;
