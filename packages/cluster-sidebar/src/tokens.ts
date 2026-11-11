/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectionToken } from "@ogre-tools/injectable";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";

export interface SidebarItemRegistration {
  id?: undefined;
  parentId: string | null;
  title: StrictReactNode;
  onClick: () => void;
  getIcon?: () => StrictReactNode;
  isActive?: IComputedValue<boolean>;
  isVisible?: IComputedValue<boolean>;
  /**
   * Leaves a visible item out of the sidebar tree, and out of the tabs shown
   * for the pages of its parent. It stays a sidebar item for everything else
   * that reads them: the command palette lists it, and a favorite of it or of
   * its parent shows it. Defaults to `false`.
   */
  isHiddenInTree?: IComputedValue<boolean>;
  orderNumber: number | IComputedValue<number>;
  /**
   * The key of the saved order of the sidebar that gives a top-level item its
   * `orderNumber`, which a drag and drop moves. Defaults to the id of the item.
   * The top-level items of an extension share the key of the extension, so
   * that they move together.
   */
  orderKey?: string;
}

export interface SidebarItemDeclaration {
  id: string;
  parentId: string | null;
  title: StrictReactNode;
  onClick: () => void;
  getIcon?: () => StrictReactNode;
  isActive: IComputedValue<boolean>;
  isVisible: IComputedValue<boolean>;
  /**
   * Whether the item is left out of the sidebar tree; for an item with
   * children, whether none of its visible children is in the tree.
   */
  isHiddenInTree: IComputedValue<boolean>;
  /** The key of the saved order that places the item, when it is not its id. */
  orderKey?: string;
  children: SidebarItemDeclaration[];
}

/** Whether the sidebar tree shows the item: it is visible and not hidden in the tree. */
export const isShownInSidebarTree = (item: Pick<SidebarItemDeclaration, "isVisible" | "isHiddenInTree">) =>
  item.isVisible.get() && !item.isHiddenInTree.get();

export const sidebarItemInjectionToken = getInjectionToken<SidebarItemRegistration>({
  id: "sidebar-item-injection-token",
});
