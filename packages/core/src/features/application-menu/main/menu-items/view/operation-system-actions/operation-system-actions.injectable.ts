/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getApplicationMenuOperationSystemActionInjectable } from "../../get-application-menu-operation-system-action-injectable";

export const actionForToggleDevTools = getApplicationMenuOperationSystemActionInjectable({
  id: "toggle-dev-tools",
  parentId: "view",
  orderNumber: 70,
  actionName: "toggleDevTools",
});

export const actionForResetZoom = getApplicationMenuOperationSystemActionInjectable({
  id: "reset-zoom",
  parentId: "view",
  orderNumber: 90,
  actionName: "resetZoom",
});

export const actionForZoomIn = getApplicationMenuOperationSystemActionInjectable({
  id: "zoom-in",
  parentId: "view",
  orderNumber: 100,
  actionName: "zoomIn",
});

// Note: the default accelerator of the "zoomIn" role is "CommandOrControl+Plus", which
// Electron resolves to Control and Shift and the "=/+" key. On keyboard layouts where "+"
// is not the shifted "=" (German, Italian, and others), and on the numeric keypad, that
// combination is never produced, so zooming in does not work while zooming out does.
// These hidden items register the missing shortcuts without duplicating the menu entry.
export const actionForZoomInWithEqualsSign = getApplicationMenuOperationSystemActionInjectable({
  id: "zoom-in-with-equals-sign",
  parentId: "view",
  orderNumber: 101,
  actionName: "zoomIn",
  keyboardShortcut: "CommandOrControl+=",
  visible: false,
});

export const actionForZoomInWithNumpadPlus = getApplicationMenuOperationSystemActionInjectable({
  id: "zoom-in-with-numpad-plus",
  parentId: "view",
  orderNumber: 102,
  actionName: "zoomIn",
  keyboardShortcut: "CommandOrControl+numadd",
  visible: false,
});

export const actionForZoomOut = getApplicationMenuOperationSystemActionInjectable({
  id: "zoom-out",
  parentId: "view",
  orderNumber: 110,
  actionName: "zoomOut",
});

export const actionForZoomOutWithNumpadMinus = getApplicationMenuOperationSystemActionInjectable({
  id: "zoom-out-with-numpad-minus",
  parentId: "view",
  orderNumber: 111,
  actionName: "zoomOut",
  keyboardShortcut: "CommandOrControl+numsub",
  visible: false,
});

export const actionForToggleFullScreen = getApplicationMenuOperationSystemActionInjectable({
  id: "toggle-full-screen",
  parentId: "view",
  orderNumber: 130,
  actionName: "togglefullscreen",
});
