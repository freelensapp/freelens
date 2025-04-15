import type { KubeObject } from "@freelensapp/kube-object";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectionToken } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";
import type React from "react";
import type { KubeObjectMenuProps } from "./kube-object-menu";

export type KubeObjectMenuItemComponent = React.ElementType<KubeObjectMenuProps<KubeObject>>;

export interface KubeObjectMenuItem {
  kind: string;
  apiVersions: string[];
  enabled: IComputedValue<boolean>;
  Component: KubeObjectMenuItemComponent;
  orderNumber: number;
}

export const kubeObjectMenuItemInjectionToken = getInjectionToken<KubeObjectMenuItem>({
  id: "kube-object-menu-item-injection-token",
});
