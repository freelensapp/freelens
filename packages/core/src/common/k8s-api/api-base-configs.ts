/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

export const apiBaseServerAddressInjectionToken = getInjectionToken<string>({
  id: "api-base-config-server-address-token",
});

/**
 * The `Host` header requests to lens-proxy must carry, or `undefined` when the
 * process does not need to set one.
 *
 * Main connects to 127.0.0.1 and has to name the target itself. The renderer
 * requests its own origin, which already is that name, so Chromium sends the
 * header on its own — and would drop this one anyway, `host` being a forbidden
 * header name.
 */
export const apiBaseHostHeaderInjectionToken = getInjectionToken<string | undefined>({
  id: "api-base-host-header-token",
});
