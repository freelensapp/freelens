/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IconProps } from "@freelensapp/icon";
import type { StrictReactNode } from "@freelensapp/utilities";

import type { IComputedValue } from "mobx";
import type React from "react";

import type { PageTarget } from "../../routes/page-registration";

export interface ClusterPageMenuRegistration {
  id?: string;
  parentId?: string;
  target?: PageTarget;
  title: StrictReactNode;
  components: ClusterPageMenuComponents;
  visible?: IComputedValue<boolean>;
  /**
   * Orders the menu among its siblings of the same extension: the top-level
   * menus of the extension among themselves, a child among the other children
   * of its parent. Lower comes first, and menus with the same number, or
   * without one, keep the order of registration. Defaults to 9999.
   *
   * The top-level menus of an extension form one block in the cluster sidebar,
   * which the user places by drag and drop, so this number never moves the
   * menu out of that block or among the items of the host.
   */
  orderNumber?: number;
}

export interface ClusterPageMenuComponents {
  Icon?: React.ComponentType<IconProps> | null | undefined;
}
