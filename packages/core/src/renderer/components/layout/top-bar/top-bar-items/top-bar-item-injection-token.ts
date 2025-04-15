/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type React from "react";

export interface TopBarItem {
  id: string;
  isShown: IComputedValue<boolean>;
  orderNumber: number;
  Component: React.ComponentType;
}

export const topBarItemOnRightSideInjectionToken = getInjectionToken<TopBarItem>({
  id: "top-bar-item-on-right-side-injection-token",
});

export const topBarItemOnLeftSideInjectionToken = getInjectionToken<TopBarItem>({
  id: "top-bar-item-on-left-side-injection-token",
});
