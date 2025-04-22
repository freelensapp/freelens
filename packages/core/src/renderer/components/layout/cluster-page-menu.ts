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
  orderNumber?: number;
}

export interface ClusterPageMenuComponents {
  Icon: React.ComponentType<IconProps>;
}
