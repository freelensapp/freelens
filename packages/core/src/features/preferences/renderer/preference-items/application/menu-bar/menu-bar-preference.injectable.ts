/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { preferenceItemInjectionToken } from "../../preference-item-injection-token";
import { MenuBar } from "./menu-bar";

const menuBarPreferenceBlockInjectable = getInjectable({
  id: "menu-bar-preference-item",

  instantiate: () => ({
    kind: "block" as const,
    id: "menu-bar",
    parentId: "application-page",
    orderNumber: 32,
    Component: MenuBar,
  }),

  injectionToken: preferenceItemInjectionToken,
});

export default menuBarPreferenceBlockInjectable;
