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

export const actionForToggleFullScreen = getApplicationMenuOperationSystemActionInjectable({
  id: "toggle-full-screen",
  parentId: "view",
  orderNumber: 130,
  actionName: "togglefullscreen",
});
