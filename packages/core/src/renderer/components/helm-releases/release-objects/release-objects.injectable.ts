/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { compareShallow, computed, onBecomeObserved, onBecomeUnobserved } from "mobx";
import subscribeStoresInjectable from "../../../kube-watch-api/subscribe-stores.injectable";
import releaseObjectStoresInjectable from "./release-object-stores.injectable";

/**
 * The metadata of the Secrets and ConfigMaps Helm stores its releases in, in
 * the selected namespaces. It changes only when a release object changes, so it
 * tells the list of releases when to reload, without downloading the releases.
 */
const releaseObjectsInjectable = getInjectable({
  id: "release-objects",

  instantiate: (di) => {
    const subscribeStores = di.inject(subscribeStoresInjectable);
    const stores = di.inject(releaseObjectStoresInjectable);

    // Every event and every reload makes a new array: compare the objects, so
    // that only a changed release object reloads the releases.
    const releaseObjects = computed(() => stores.flatMap((store) => store.contextItems), { equals: compareShallow });

    let unsubscribe: (() => void) | undefined;

    onBecomeObserved(releaseObjects, () => {
      unsubscribe = subscribeStores(stores);
    });

    onBecomeUnobserved(releaseObjects, () => {
      unsubscribe?.();
    });

    return releaseObjects;
  },
});

export default releaseObjectsInjectable;
