/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { exportThemeChannel, importThemeChannel, removeThemeChannel } from "../common/channels";

import type {
  ExportThemeResponse,
  ImportThemeRequest,
  ImportThemeResponse,
  RemoveThemeResponse,
} from "../common/channels";

export interface ThemeActions {
  importTheme: (request?: ImportThemeRequest) => Promise<ImportThemeResponse>;
  exportTheme: (name: string) => Promise<ExportThemeResponse>;
  removeTheme: (name: string) => Promise<RemoveThemeResponse>;
}

/**
 * Import, export and remove, which the main process carries out, as it owns the themes directory
 * and the file dialogs.
 */
const themeActionsInjectable = getInjectable({
  id: "theme-actions",
  instantiate: (di): ThemeActions => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return {
      importTheme: (request = { action: "choose" }) => requestFromChannel(importThemeChannel, request),
      exportTheme: (name) => requestFromChannel(exportThemeChannel, name),
      removeTheme: (name) => requestFromChannel(removeThemeChannel, name),
    };
  },
});

export default themeActionsInjectable;
