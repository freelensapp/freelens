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
}

// The items change the zoom preference rather than the zoom of the focused window, as Electron's own roles would:
// main applies the preference to every window, and it survives a restart.
const getZoomMenuItemInjectable = ({ id, orderNumber, label, keyboardShortcut, getZoom }: ZoomMenuItem) =>
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

export const zoomOutMenuItemInjectable = getZoomMenuItemInjectable({
  id: "zoom-out",
  orderNumber: 110,
  label: "Zoom Out",
  keyboardShortcut: "CmdOrCtrl+-",
  getZoom: getPreviousZoomStep,
});
