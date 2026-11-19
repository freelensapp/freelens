/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import assert from "node:assert";
import { jobApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { kubeObjectStoreInjectionToken } from "../../../common/k8s-api/api-manager/kube-object-store-token";
import clusterFrameContextForNamespacedResourcesInjectable from "../../cluster-frame-context/for-namespaced-resources.injectable";
import watchReconnectInjectable from "../../k8s/watch-reconnect/watch-reconnect.injectable";
import getPodsByOwnerIdInjectable from "../workloads-pods/get-pods-by-owner-id.injectable";
import { JobStore } from "./store";

const jobStoreInjectable = getInjectable({
  id: "job-store",
  instantiate: (di) => {
    assert(di.inject(storesAndApisCanBeCreatedInjectionToken), "jobStore is only available in certain environments");

    const api = di.inject(jobApiInjectable);

    return new JobStore(
      {
        getPodsByOwnerId: di.inject(getPodsByOwnerIdInjectable),
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        watchReconnect: di.inject(watchReconnectInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api,
    );
  },
  injectionToken: kubeObjectStoreInjectionToken,
});

export default jobStoreInjectable;
