import { beforeElectronIsReadyInjectionToken } from "@freelensapp/application-for-electron-main";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import forceAppExitInjectable from "../features/force-app-exit.injectable";
import requestSingleInstanceLockInjectable from "../features/request-single-instance-lock.injectable";

const enforceSingleApplicationInstanceInjectable = getInjectable({
  id: "enforce-single-application-instance",

  instantiate: (di) => ({
    run: () => {
      const requestSingleInstanceLock = di.inject(requestSingleInstanceLockInjectable);
      const forceAppExit = di.inject(forceAppExitInjectable);

      if (!requestSingleInstanceLock()) {
        forceAppExit();
      }

      return undefined;
    },
  }),

  injectionToken: beforeElectronIsReadyInjectionToken,
});

export default enforceSingleApplicationInstanceInjectable;
