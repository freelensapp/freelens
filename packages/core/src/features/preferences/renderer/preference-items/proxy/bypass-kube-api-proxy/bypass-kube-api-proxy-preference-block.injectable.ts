/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { BypassKubeApiProxy } from "./bypass-kube-api-proxy";

const bypassKubeApiProxyPreferenceBlockInjectable = getInjectable({
  id: "bypass-kube-api-proxy-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "bypass-kube-api-proxy",
    parentId: "proxy-page",
    orderNumber: 15,
    Component: BypassKubeApiProxy,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default bypassKubeApiProxyPreferenceBlockInjectable;
