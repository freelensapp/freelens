/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import type { Settings } from "electron";
import electronAppInjectable from "../electron-app.injectable";
import { loggerInjectionToken } from "@freelensapp/logger";

export type SetLoginItemSettings = (settings: Settings) => void;

const setLoginItemSettingsInjectable = getInjectable({
  id: "set-login-item-settings",
  instantiate: (di): SetLoginItemSettings => {
    const electronApp = di.inject(electronAppInjectable);
    const logger = di.inject(loggerInjectionToken);

    return (settings) => {
      try {
        electronApp.setLoginItemSettings(settings);
      } catch (error: any) {
        logger.warn(`[set-login-item-settings] failed to set login item settings: ${error?.message || error}`);
      }
    };
  },
});

export default setLoginItemSettingsInjectable;
