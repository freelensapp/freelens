/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";
import type { IComputedValue } from "mobx";
import type React from "react";

export interface KubeObjectMenuItemProps {
  object: KubeObject;
  toolbar?: boolean;
}

export interface KubeObjectMenuComponents {
  MenuItem: React.ComponentType<KubeObjectMenuItemProps>;
}

export interface KubeObjectMenuRegistration {
  kind: string;
  apiVersions: string[];
  components: KubeObjectMenuComponents;
  visible?: IComputedValue<boolean>;
}
