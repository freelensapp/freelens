/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { kubeEventApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import watchReconnectInjectable from "../../k8s/watch-reconnect/watch-reconnect.injectable";
import getPodByIdInjectable from "../workloads-pods/get-pod-by-id.injectable";
import { EventStore } from "./store";

const eventStoreInjectable = getInjectable({
  id: "event-store",
  instantiate: (di) => {
    assert(di.inject(storesAndApisCanBeCreatedInjectionToken), "eventStore is only available in certain environments");

    const api = di.inject(kubeEventApiInjectable);

    return new EventStore(
      {
        getPodById: di.inject(getPodByIdInjectable),
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        watchReconnect: di.inject(watchReconnectInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default eventStoreInjectable;
