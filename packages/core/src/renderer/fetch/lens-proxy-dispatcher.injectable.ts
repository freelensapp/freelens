/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensProxyDispatcherInjectionToken } from "../../common/fetch/lens-proxy-dispatcher-injection-token";

/**
 * Chromium's fetch takes no dispatcher, and the window's session already trusts
 * the lens-proxy certificate.
 */
const lensProxyDispatcherInjectable = getInjectable({
  id: "lens-proxy-dispatcher",
  instantiate: () => () => undefined,
  injectionToken: lensProxyDispatcherInjectionToken,
});

export default lensProxyDispatcherInjectable;
