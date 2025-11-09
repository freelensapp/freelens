/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import {ipcMain, Menu, Tray} from "electron";
import applicationDescriptionInjectable from "../../../common/vars/application-description.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import showApplicationWindowInjectable from "../../start-main-application/lens-window/show-application-window.injectable";
import trayIconInjectable from "../menu-icon/tray-icon.injectable";
import { convertToElectronMenuTemplate } from "../reactive-tray-menu-items/converters";

const TRAY_LOG_PREFIX = "[TRAY]";

export interface MinimalTrayMenuItem {
  id: string;
  parentId: string | null;
  enabled: boolean;
  label?: string;
  click?: () => Promise<void> | void;
  tooltip?: string;
  separator?: boolean;
}

export interface ElectronTray {
  start(): void;
  stop(): void;
  setMenuItems(menuItems: MinimalTrayMenuItem[]): void;
  setIconPath(iconPath: string): void;
}

const electronTrayInjectable = getInjectable({
  id: "electron-tray",

  instantiate: (di): ElectronTray => {
    const applicationDescription = di.inject(applicationDescriptionInjectable);
    const showApplicationWindow = di.inject(showApplicationWindowInjectable);
    const isWindows = di.inject(isWindowsInjectable);
    const logger = di.inject(loggerInjectionToken);
    const trayIcon = di.inject(trayIconInjectable);

    let tray: Tray;

    const start = () => {
      tray = new Tray(trayIcon.get().iconPath);
      tray.setToolTip(applicationDescription);
      tray.setIgnoreDoubleClickEvents(true);

      if (isWindows) {
        tray.on("click", () => {
          showApplicationWindow().catch((error) =>
            logger.error(`${TRAY_LOG_PREFIX}: Failed to open lens`, { error }),
          );
        });
      }
    };

    const stop = () => {
      if (tray) {
        tray.destroy();
      }
    };

    ipcMain.on("tray:set-visible", (_, visible: boolean) => {
      if (visible) start();
      else stop();
    });

    return {
      start,
      stop,
      setMenuItems: (menuItems) => {
        const template = convertToElectronMenuTemplate(menuItems);
        const menu = Menu.buildFromTemplate(template);
        tray.setContextMenu(menu);
      },
      setIconPath: (iconPath) => {
        tray.setImage(iconPath);
      },
    };
  },

  causesSideEffects: true,
});

export default electronTrayInjectable;
