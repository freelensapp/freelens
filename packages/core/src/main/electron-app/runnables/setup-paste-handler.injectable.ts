/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";

import type { BrowserWindow } from "electron";

export type SetupPasteHandler = (win: BrowserWindow) => void;

/**
 * Patch for Monaco Editor paste handling in Electron apps.
 *
 * Intercepts the paste keyboard shortcut and triggers the native paste
 * action. This ensures that paste operations work correctly within Monaco
 * Editor instances.
 *
 * See: https://github.com/microsoft/monaco-editor/issues/4855
 */
const setupPasteHandlerInjectable = getInjectable({
  id: "setup-paste-handler",

  instantiate: (di): SetupPasteHandler => {
    const isMac = di.inject(isMacInjectable);

    return (win) => {
      win.webContents.on("before-input-event", (event, input) => {
        const isCmdOrCtrl = isMac ? input.meta === true : input.control === true;

        const hasShift = input.shift === true || input.modifiers.includes("shift");

        const hasAlt = input.alt === true || input.modifiers.includes("alt");

        const isV = input.code === "KeyV" || input.key === "v";

        const shouldPaste = input.type === "keyDown" && isCmdOrCtrl && !hasShift && !hasAlt && isV;

        if (shouldPaste) {
          // Native paste path (works with Monaco)
          win.webContents.paste();
          event.preventDefault();
        }
      });
    };
  },
});
export default setupPasteHandlerInjectable;
