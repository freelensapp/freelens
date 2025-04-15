/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { applicationInformationToken } from "@freelensapp/application";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { BrowserWindow } from "electron";
import type { RequireExactlyOne } from "type-fest";
import pathExistsSyncInjectable from "../../../../common/fs/path-exists-sync.injectable";
import getAbsolutePathInjectable from "../../../../common/path/get-absolute-path.injectable";
import openLinkInBrowserInjectable from "../../../../common/utils/open-link-in-browser.injectable";
import isLinuxInjectable from "../../../../common/vars/is-linux.injectable";
import lensResourcesDirInjectable from "../../../../common/vars/lens-resources-dir.injectable";
import applicationWindowStateInjectable from "./application-window-state.injectable";
import type { ElectronWindow } from "./create-lens-window.injectable";
import sessionCertificateVerifierInjectable from "./session-certificate-verifier.injectable";

export type ElectronWindowTitleBarStyle = "hiddenInset" | "hidden" | "default" | "customButtonsOnHover";

export interface FileSource {
  file: string;
}
export interface UrlSource {
  url: string;
}
export type ContentSource = RequireExactlyOne<FileSource & UrlSource>;

export interface ElectronWindowConfiguration {
  id: string;
  title: string;
  defaultHeight: number;
  defaultWidth: number;
  getContentSource: () => ContentSource;
  resizable: boolean;
  windowFrameUtilitiesAreShown: boolean;
  centered: boolean;
  titleBarStyle?: ElectronWindowTitleBarStyle;
  beforeOpen?: () => Promise<void>;
  onClose: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onDomReady?: () => void;
}

export type CreateElectronWindow = (config: ElectronWindowConfiguration) => ElectronWindow;

const createElectronWindowInjectable = getInjectable({
  id: "create-electron-window",

  instantiate: (di): CreateElectronWindow => {
    const logger = di.inject(loggerInjectionToken);
    const openLinkInBrowser = di.inject(openLinkInBrowserInjectable);
    const getAbsolutePath = di.inject(getAbsolutePathInjectable);
    const lensResourcesDir = di.inject(lensResourcesDirInjectable);
    const isLinux = di.inject(isLinuxInjectable);
    const applicationInformation = di.inject(applicationInformationToken);
    const pathExistsSync = di.inject(pathExistsSyncInjectable);
    const sessionCertificateVerifier = di.inject(sessionCertificateVerifierInjectable);

    return (configuration) => {
      const applicationWindowState = di.inject(applicationWindowStateInjectable, {
        id: configuration.id,
        defaultHeight: configuration.defaultHeight,
        defaultWidth: configuration.defaultWidth,
      });

      const { width, height, x, y } = applicationWindowState;

      const browserWindow = new BrowserWindow({
        x,
        y,
        width,
        height,
        title: configuration.title,
        resizable: configuration.resizable,
        center: configuration.centered,
        frame: configuration.windowFrameUtilitiesAreShown,
        show: false,
        minWidth: 700, // accommodate 800 x 600 display minimum
        minHeight: 500, // accommodate 800 x 600 display minimum
        titleBarStyle: configuration.titleBarStyle,
        backgroundColor: "#1e2124",
        webPreferences: {
          nodeIntegration: true,
          nodeIntegrationInSubFrames: true,
          contextIsolation: false,
        },
      });

      if (isLinux) {
        const iconFileName = [
          getAbsolutePath(lensResourcesDir, `../${applicationInformation.name}.png`),
          `/usr/share/icons/hicolor/512x512/apps/${applicationInformation.name}.png`,
        ].find(pathExistsSync);

        if (iconFileName != null) {
          try {
            browserWindow.setIcon(iconFileName);
          } catch (err) {
            logger.warn(`Error while setting window icon ${err}`);
          }
        } else {
          logger.warn(`No suitable icon found for task bar.`);
        }
      }

      applicationWindowState.manage(browserWindow);

      browserWindow.webContents.session.setCertificateVerifyProc(sessionCertificateVerifier);

      browserWindow
        .on("focus", () => {
          configuration.onFocus?.();
        })
        .on("blur", () => {
          configuration.onBlur?.();
        })
        .on("closed", () => {
          configuration.onClose();
          applicationWindowState.unmanage();
        })
        .webContents.on("dom-ready", () => {
          configuration.onDomReady?.();
        })
        .on("did-fail-load", (_event, code, desc) => {
          logger.error(`[CREATE-ELECTRON-WINDOW]: Failed to load window "${configuration.id}"`, {
            code,
            desc,
          });
        })
        .on("did-finish-load", () => {
          logger.info(`[CREATE-ELECTRON-WINDOW]: Window "${configuration.id}" loaded`);
        })
        .setWindowOpenHandler((details) => {
          openLinkInBrowser(details.url).catch((error) => {
            logger.error("[CREATE-ELECTRON-WINDOW]: failed to open browser", {
              error,
            });
          });

          return { action: "deny" };
        });

      return {
        loadFile: async (filePath) => {
          logger.info(
            `[CREATE-ELECTRON-WINDOW]: Loading content for window "${configuration.id}" from file: ${filePath}...`,
          );

          await browserWindow.loadFile(filePath);
        },

        loadUrl: async (url) => {
          logger.info(`[CREATE-ELECTRON-WINDOW]: Loading content for window "${configuration.id}" from url: ${url}...`);

          await browserWindow.loadURL(url);
        },

        show: () => browserWindow.show(),
        close: () => browserWindow.close(),
        send: ({ channel, data, frameInfo }) => {
          if (frameInfo) {
            browserWindow.webContents.sendToFrame([frameInfo.processId, frameInfo.frameId], channel, data);
          } else {
            browserWindow.webContents.send(channel, data);
          }
        },

        reload: () => {
          const wc = browserWindow.webContents;

          wc.reload();
          wc.navigationHistory.clear();
        },
      };
    };
  },

  causesSideEffects: true,
});

export default createElectronWindowInjectable;
