/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { logWarningInjectionToken } from "@freelensapp/logger";
import { createPath, observableHistoryInjectionToken, parsePath } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";

import type { To } from "@freelensapp/routing";

export type Navigate = (location: To) => void;

// The browser resolves a relative pathname against the current URL, so it
// lands on a page that depends on where the call is made from. It is still
// navigated to, because a throw would break calls that work by accident.
const hasRelativePathname = (location: To) => {
  const pathname = typeof location === "string" ? parsePath(location).pathname : location.pathname;

  return !!pathname && !pathname.startsWith("/");
};

const navigateInjectable = getInjectable({
  id: "navigate",
  instantiate: (di): Navigate => {
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const logWarning = di.inject(logWarningInjectionToken);

    return action((location) => {
      if (hasRelativePathname(location)) {
        logWarning(
          `[NAVIGATE]: the pathname of ${JSON.stringify(location)} is relative and is resolved against the current URL; the pathname must be absolute (start with "/")`,
        );
      }

      const currentLocation = createPath(observableHistory.location);

      observableHistory.push(location);

      const newLocation = createPath(observableHistory.location);

      if (currentLocation === newLocation) {
        observableHistory.goBack(); // prevent sequences of same url in history
      }
    });
  },
});

export default navigateInjectable;
