/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import lensProtocolRouterMainInjectable from "../../protocol-handler/lens-protocol-router-main/lens-protocol-router-main.injectable";
import { onQuitOfBackEndInjectionToken } from "../../start-main-application/runnable-tokens/phases";

const cleanUpDeepLinkingInjectable = getInjectable({
  id: "clean-up-deep-linking",

  instantiate: (di) => ({
    run: () => {
      const lensProtocolRouterMain = di.inject(lensProtocolRouterMainInjectable);

      lensProtocolRouterMain.cleanup();

      return undefined;
    },
  }),

  injectionToken: onQuitOfBackEndInjectionToken,
});

export default cleanUpDeepLinkingInjectable;
