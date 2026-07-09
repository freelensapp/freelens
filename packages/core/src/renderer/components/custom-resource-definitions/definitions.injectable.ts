/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { getInjectable } from "@ogre-tools/injectable";
import { computed, when } from "mobx";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import customResourceDefinitionStoreInjectable from "./store.injectable";

const customResourceDefinitionsInjectable = getInjectable({
  id: "custom-resource-definitions",

  instantiate: (di) => {
    const createStoresAndApis = di.inject(storesAndApisCanBeCreatedInjectionToken);

    if (!createStoresAndApis) {
      return computed(() => []);
    }

    const store = di.inject(customResourceDefinitionStoreInjectable);
    const subscribeStores = di.inject(subscribeStoresInjectable);
    const hostedCluster = di.inject(hostedClusterInjectable);

    // Defer subscribing the CRD store until the cluster is ready. This injectable
    // is instantiated as a side-effect of building the sidebar, which can happen
    // before `cluster.activate()` has finished starting the kube-auth-proxy. If the
    // store subscribes too early, `loadAll()` fails against an unreachable proxy and
    // the store's refcount gets stuck, leaving the CRD watch permanently broken and
    // the cluster view stuck on the loading screen (see issue #1617).
    if (hostedCluster) {
      when(
        () => hostedCluster.ready.get(),
        () => subscribeStores([store]),
      );
    } else {
      subscribeStores([store]);
    }

    return computed(() => [...store.items]);
  },
});

export default customResourceDefinitionsInjectable;
