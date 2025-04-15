/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { StrictReactNode } from "@freelensapp/utilities";
import { getInjectionToken } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

export interface SidebarItemRegistration {
  id?: undefined;
  parentId: string | null;
  title: StrictReactNode;
  onClick: () => void;
  getIcon?: () => StrictReactNode;
  isActive?: IComputedValue<boolean>;
  isVisible?: IComputedValue<boolean>;
  orderNumber: number;
}

export interface SidebarItemDeclaration {
  id: string;
  parentId: string | null;
  title: StrictReactNode;
  onClick: () => void;
  getIcon?: () => StrictReactNode;
  isActive: IComputedValue<boolean>;
  isVisible: IComputedValue<boolean>;
  children: SidebarItemDeclaration[];
}

export const sidebarItemInjectionToken = getInjectionToken<SidebarItemRegistration>({
  id: "sidebar-item-injection-token",
});
