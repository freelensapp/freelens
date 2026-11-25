/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "@freelensapp/kube-object";

import type { IComputedValue } from "mobx";
import type React from "react";

export interface KubeObjectMenuItemProps<Object extends KubeObject = KubeObject> {
  object: Object;
  toolbar?: boolean;
}

export interface KubeObjectMenuComponents<Props extends KubeObjectMenuItemProps = KubeObjectMenuItemProps> {
  MenuItem: React.ComponentType<Props>;
}

/**
 * `MenuItem` is rendered with {@link KubeObjectMenuItemProps} and nothing else.
 * The default leaves the object `any`, because the host renders the item only
 * for the `kind` and `apiVersions` registered, so a component typed for that
 * resource, such as `KubeObjectMenuItemProps<Pod>`, fits. Nothing here checks
 * that the component was written for that resource, though;
 * `Renderer.K8sApi.menuItemFor` builds the registration from the model class
 * and does.
 */
export interface KubeObjectMenuRegistration<Props extends KubeObjectMenuItemProps = KubeObjectMenuItemProps<any>> {
  kind: string;
  apiVersions: string[];
  components: KubeObjectMenuComponents<Props>;
  visible?: IComputedValue<boolean>;
}
