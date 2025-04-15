/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { onLoadOfApplicationInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import shouldStartHiddenInjectable from "../../electron-app/features/should-start-hidden.injectable";
import splashWindowInjectable from "../lens-window/splash-window/splash-window.injectable";

const showLoadingInjectable = getInjectable({
  id: "show-loading",

  instantiate: (di) => ({
    run: async () => {
      const shouldStartHidden = di.inject(shouldStartHiddenInjectable);
      const shouldShowLoadingWindow = !shouldStartHidden;
      const splashWindow = di.inject(splashWindowInjectable);

      if (shouldShowLoadingWindow) {
        await splashWindow.start();
      }
    },
  }),
  injectionToken: onLoadOfApplicationInjectionToken,
});

export default showLoadingInjectable;
