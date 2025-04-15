/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { topBarItemOnLeftSideInjectionToken } from "../top-bar-item-injection-token";
import { NavigationToForward } from "./navigation-to-forward";

const navigationToForwardTopBarItemInjectable = getInjectable({
  id: "navigation-to-forward-top-bar-item",

  instantiate: () => ({
    id: "navigation-to-forward",
    isShown: computed(() => true),
    orderNumber: 40,
    Component: NavigationToForward,
  }),

  injectionToken: topBarItemOnLeftSideInjectionToken,
});

export default navigationToForwardTopBarItemInjectable;
