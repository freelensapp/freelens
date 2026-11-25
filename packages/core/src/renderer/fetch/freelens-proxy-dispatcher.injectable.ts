/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { freelensProxyDispatcherInjectionToken } from "../../common/fetch/freelens-proxy-dispatcher-injection-token";

/**
 * Chromium's fetch takes no dispatcher, and the window's session already trusts
 * the freelens-proxy certificate.
 */
const freelensProxyDispatcherInjectable = getInjectable({
  id: "freelens-proxy-dispatcher",
  instantiate: () => () => undefined,
  injectionToken: freelensProxyDispatcherInjectionToken,
});

export default freelensProxyDispatcherInjectable;
