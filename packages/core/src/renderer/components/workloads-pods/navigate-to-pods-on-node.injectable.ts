/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { navigateToRouteInjectionToken } from "../../../common/front-end-routing/navigate-to-route-injection-token";
import podsRouteInjectable from "../../../common/front-end-routing/routes/cluster/workloads/pods/pods-route.injectable";
import nodeUrlPageParamInjectable from "../item-object-list/page-filters/node-url-param.injectable";
import namespaceStoreInjectable from "../namespaces/store.injectable";

export type NavigateToPodsOnNode = (nodeName: string) => void;

// Opens the Pods list of all namespaces, filtered to the pods scheduled on the node.
const navigateToPodsOnNodeInjectable = getInjectable({
  id: "navigate-to-pods-on-node",

  instantiate: (di): NavigateToPodsOnNode => {
    const navigateToRoute = di.inject(navigateToRouteInjectionToken);
    const podsRoute = di.inject(podsRouteInjectable);
    const nodeUrlParam = di.inject(nodeUrlPageParamInjectable);
    const namespaceStore = di.inject(namespaceStoreInjectable);

    return (nodeName) => {
      namespaceStore.selectAll();
      navigateToRoute(podsRoute, { query: { [nodeUrlParam.name]: nodeName } });
    };
  },
});

export default navigateToPodsOnNodeInjectable;
