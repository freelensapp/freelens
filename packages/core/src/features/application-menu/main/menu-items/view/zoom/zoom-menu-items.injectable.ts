/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { defaultZoom, getNextZoomStep, getPreviousZoomStep } from "../../../../../zoom/common/zoom-steps";
import applicationMenuItemInjectionToken from "../../application-menu-item-injection-token";

interface ZoomMenuItem {
  id: string;
  orderNumber: number;
  label: string;
  keyboardShortcut: string;
  getZoom: (current: number) => number;
  visible?: false;
}

// The items change the zoom preference rather than the zoom of the focused window, as Electron's own roles would:
// main applies the preference to every window, and it survives a restart.
const getZoomMenuItemInjectable = ({ id, orderNumber, label, keyboardShortcut, getZoom, visible }: ZoomMenuItem) =>
  getInjectable({
    id: `${id}-menu-item`,

    instantiate: (di) => {
      const state = di.inject(userPreferencesStateInjectable);

      return {
        kind: "clickable-menu-item" as const,
        parentId: "view",
        id,
        orderNumber,
        label,
        keyboardShortcut,
        ...(visible === false ? { visible } : {}),

        onClick: () => {
          runInAction(() => {
            state.zoom = getZoom(state.zoom ?? defaultZoom);
          });
        },
      };
    },

    injectionToken: applicationMenuItemInjectionToken,
  });

export const resetZoomMenuItemInjectable = getZoomMenuItemInjectable({
  id: "reset-zoom",
  orderNumber: 90,
  label: "Actual Size",
  keyboardShortcut: "CmdOrCtrl+0",
  getZoom: () => defaultZoom,
});

export const zoomInMenuItemInjectable = getZoomMenuItemInjectable({
  id: "zoom-in",
  orderNumber: 100,
  label: "Zoom In",
  keyboardShortcut: "CmdOrCtrl+Plus",
  getZoom: getNextZoomStep,
});

// Electron resolves "Plus" to Shift and the "=/+" key, which only produces "+" where it is the shifted "=", as on US
// keyboards. On layouts with a key of its own for "+" (German, Italian and others), and on the numeric keypad, that
// combination never comes, so zooming in did not work from the keyboard while zooming out did. Hidden items add the
// missing shortcuts without a second entry in the menu: Electron registers the shortcut of a hidden item all the same.
export const zoomInWithEqualsSignMenuItemInjectable = getZoomMenuItemInjectable({
  id: "zoom-in-with-equals-sign",
  orderNumber: 101,
  label: "Zoom In",
  keyboardShortcut: "CmdOrCtrl+=",
  getZoom: getNextZoomStep,
  visible: false,
});

export const zoomInWithNumpadPlusMenuItemInjectable = getZoomMenuItemInjectable({
  id: "zoom-in-with-numpad-plus",
  orderNumber: 102,
  label: "Zoom In",
  keyboardShortcut: "CmdOrCtrl+numadd",
  getZoom: getNextZoomStep,
  visible: false,
});

export const zoomOutMenuItemInjectable = getZoomMenuItemInjectable({
  id: "zoom-out",
  orderNumber: 110,
  label: "Zoom Out",
  keyboardShortcut: "CmdOrCtrl+-",
  getZoom: getPreviousZoomStep,
});

export const zoomOutWithNumpadMinusMenuItemInjectable = getZoomMenuItemInjectable({
  id: "zoom-out-with-numpad-minus",
  orderNumber: 111,
  label: "Zoom Out",
  keyboardShortcut: "CmdOrCtrl+numsub",
  getZoom: getPreviousZoomStep,
  visible: false,
});
