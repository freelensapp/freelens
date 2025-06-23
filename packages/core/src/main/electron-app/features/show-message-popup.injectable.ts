/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import electronDialogInjectable from "./electron-dialog.injectable";

import type { MessageBoxReturnValue } from "electron";

export interface ShowMessagePopupOptions {
  buttons?: string[];
  textWidth?: number;
  type?: "none" | "info" | "error" | "question" | "warning";
}

export type ShowMessagePopup = (
  title: string,
  message: string,
  detail: string,
  options?: ShowMessagePopupOptions,
) => Promise<MessageBoxReturnValue>;

const showMessagePopupInjectable = getInjectable({
  id: "show-message-popup",

  instantiate: (di): ShowMessagePopup => {
    const dialog = di.inject(electronDialogInjectable);

    return async (title, message, detail, options = {}) => {
      return await dialog.showMessageBox({
        title,
        message,
        detail,
        type: "info",
        buttons: ["Close"],
        ...options,
      });
    };
  },

  causesSideEffects: true,
});

export default showMessagePopupInjectable;
