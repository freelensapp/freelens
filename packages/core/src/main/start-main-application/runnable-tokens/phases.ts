/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Runnable, RunnableSync } from "@freelensapp/run-many";
import { getInjectionToken } from "@ogre-tools/injectable";

export const afterQuitOfFrontEndInjectionToken = getInjectionToken<RunnableSync>({
  id: "after-quit-of-front-end",
});

export const onQuitOfBackEndInjectionToken = getInjectionToken<Runnable>({
  id: "on-quit-of-back-end",
});

export const afterWindowIsOpenedInjectionToken = getInjectionToken<Runnable>({
  id: "after-window-is-opened",
});

export const afterRootFrameIsReadyInjectionToken = getInjectionToken<Runnable>({
  id: "after-root-frame-is-ready",
});

export const afterApplicationIsLoadedInjectionToken = getInjectionToken<Runnable>({
  id: "after-application-is-loaded",
});
