/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { apiBaseServerAddressInjectionToken } from "../../common/k8s-api/api-base-configs";
import windowLocationInjectable from "../../common/k8s-api/window-location.injectable";

const apiBaseServerAddressInjectable = getInjectable({
  id: "api-base-server-address",
  instantiate: (di) => {
    const { host } = di.inject(windowLocationInjectable);

    // The frame's own origin, not 127.0.0.1: `<clusterId>.renderer.freelens.app`
    // is what lens-proxy routes on, Chromium's host-resolver rules map it to
    // 127.0.0.1, and the session already trusts the certificate for it. Going
    // through the origin means the browser sets the routing `Host` header
    // itself — it cannot be set by hand, being a forbidden header name.
    return `https://${host}`;
  },
  injectionToken: apiBaseServerAddressInjectionToken,
});

export default apiBaseServerAddressInjectable;
