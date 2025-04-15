/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { onQuitOfBackEndInjectionToken } from "../../../../main/start-main-application/runnable-tokens/phases";
import watchIfUpdateShouldHappenOnQuitInjectable from "./watch-if-update-should-happen-on-quit.injectable";

const stopWatchingIfUpdateShouldHappenOnQuitInjectable = getInjectable({
  id: "stop-watching-if-update-should-happen-on-quit",

  instantiate: (di) => ({
    run: () => {
      const watchIfUpdateShouldHappenOnQuit = di.inject(watchIfUpdateShouldHappenOnQuitInjectable);

      watchIfUpdateShouldHappenOnQuit.stop();

      return undefined;
    },
  }),

  injectionToken: onQuitOfBackEndInjectionToken,
});

export default stopWatchingIfUpdateShouldHappenOnQuitInjectable;
