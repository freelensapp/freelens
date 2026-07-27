/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { logErrorInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { ignoreBrokenPipeErrors } from "./ignore-broken-pipe-errors";

const ignoreBrokenPipeErrorsInjectable = getInjectable({
  id: "ignore-broken-pipe-errors",
  instantiate: (di) => ({
    run: () => {
      const logError = di.inject(logErrorInjectionToken);

      ignoreBrokenPipeErrors(
        [
          { name: "stdout", stream: process.stdout },
          { name: "stderr", stream: process.stderr },
        ],
        logError,
      );
    },
  }),
  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default ignoreBrokenPipeErrorsInjectable;
