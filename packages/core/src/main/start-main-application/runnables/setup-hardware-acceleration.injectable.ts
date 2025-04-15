/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeElectronIsReadyInjectionToken } from "@freelensapp/application-for-electron-main";
import { getInjectable } from "@ogre-tools/injectable";
import disableHardwareAccelerationInjectable from "../../electron-app/features/disable-hardware-acceleration.injectable";
import hardwareAccelerationShouldBeDisabledInjectable from "../../vars/hardware-acceleration-should-be-disabled.injectable";

const setupHardwareAccelerationInjectable = getInjectable({
  id: "setup-hardware-acceleration",

  instantiate: (di) => ({
    run: () => {
      const hardwareAccelerationShouldBeDisabled = di.inject(hardwareAccelerationShouldBeDisabledInjectable);
      const disableHardwareAcceleration = di.inject(disableHardwareAccelerationInjectable);

      if (hardwareAccelerationShouldBeDisabled) {
        disableHardwareAcceleration();
      }

      return undefined;
    },
  }),

  injectionToken: beforeElectronIsReadyInjectionToken,
});

export default setupHardwareAccelerationInjectable;
