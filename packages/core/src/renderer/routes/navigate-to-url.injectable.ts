/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observableHistoryInjectionToken } from "@freelensapp/routing";
import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import type { NavigateToUrl } from "../../common/front-end-routing/navigate-to-url-injection-token";
import { navigateToUrlInjectionToken } from "../../common/front-end-routing/navigate-to-url-injection-token";
import broadcastMessageInjectable from "../../common/ipc/broadcast-message.injectable";
import { IpcRendererNavigationEvents } from "../../common/ipc/navigation-events";

const navigateToUrlInjectable = getInjectable({
  id: "navigate-to-url",

  instantiate: (di): NavigateToUrl => {
    const observableHistory = di.inject(observableHistoryInjectionToken);
    const broadcastMessage = di.inject(broadcastMessageInjectable);

    return (url, options = {}): void => {
      if (options.forceRootFrame) {
        return void broadcastMessage(IpcRendererNavigationEvents.NAVIGATE_IN_APP, url);
      }

      runInAction(() => {
        if (options.withoutAffectingBackButton) {
          observableHistory.replace(url);
        } else {
          observableHistory.push(url);
        }
      });
    };
  },

  injectionToken: navigateToUrlInjectionToken,
});

export default navigateToUrlInjectable;
