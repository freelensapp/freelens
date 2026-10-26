/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { createRequireDeprecationWarning, installRequireDeprecationWarning } from "./require-deprecation-warning";

/**
 * Wraps this frame's `globalThis.require` so that extension code calling it is
 * warned. Every frame that loads extensions has a `globalThis` of its own --
 * the cluster frames too, under `nodeIntegrationInSubFrames` -- so each calls
 * this before it loads any.
 */
const warnOnExtensionRequireInjectable = getInjectable({
  id: "warn-on-extension-require",
  instantiate: (di) => {
    const logger = di.inject(loggerInjectionToken);

    return () => installRequireDeprecationWarning(globalThis, createRequireDeprecationWarning(logger));
  },
});

export default warnOnExtensionRequireInjectable;
