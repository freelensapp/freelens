/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { onQuitOfBackEndInjectionToken } from "../start-main-application/runnable-tokens/phases";
import freelensProxyInjectable from "./freelens-proxy.injectable";

const closeFreelensProxyOnQuitInjectable = getInjectable({
  id: "close-freelens-proxy-on-quit",
  instantiate: (di) => ({
    run: async () => {
      const freelensProxy = di.inject(freelensProxyInjectable);

      await freelensProxy.close();
    },
  }),
  injectionToken: onQuitOfBackEndInjectionToken,
});

export default closeFreelensProxyOnQuitInjectable;
