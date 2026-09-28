/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { apiBaseHostHeaderInjectionToken } from "../../common/k8s-api/api-base-configs";

/**
 * None: the renderer requests its own origin, so Chromium sends the `Host`
 * lens-proxy routes on by itself.
 */
const apiBaseHostHeaderInjectable = getInjectable({
  id: "api-base-host-header",
  instantiate: () => undefined,
  injectionToken: apiBaseHostHeaderInjectionToken,
});

export default apiBaseHostHeaderInjectable;
