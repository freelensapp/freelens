/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import {
  storesAndApisCanBeCreatedInjectionToken,
  validatingWebhookConfigurationApiInjectable,
} from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import { ValidatingWebhookConfigurationStore } from "./validating-webhook-configuration-store";

const validatingWebhookConfigurationStoreInjectable = getInjectable({
  id: "validating-webhook-configuration-store",
  instantiate: (di) => {
    assert(
      di.inject(storesAndApisCanBeCreatedInjectionToken),
      "validatingWebhookConfigurationStore is only available in certain environments",
    );

    const api = di.inject(validatingWebhookConfigurationApiInjectable);

    return new ValidatingWebhookConfigurationStore(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default validatingWebhookConfigurationStoreInjectable;
