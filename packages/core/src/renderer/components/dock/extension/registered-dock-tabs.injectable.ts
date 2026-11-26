/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";

import type { IComputedValue } from "mobx";

import type { LensRendererExtension } from "../../../../extensions/lens-renderer-extension";
import type { DockTabRegistration } from "./dock-tab-registration";

export interface RegisteredDockTab extends DockTabRegistration {
  owner: LensRendererExtension;
  extensionName: string;
  enabled: IComputedValue<boolean>;
  pending: IComputedValue<boolean>;
}

export const registeredDockTabInjectionToken = getInjectionToken<RegisteredDockTab>({
  id: "registered-extension-dock-tab",
});

const registeredDockTabsInjectable = getInjectable({
  id: "registered-extension-dock-tabs",
  instantiate: (di) => di.inject(computedInjectManyInjectionToken)(registeredDockTabInjectionToken),
});

export default registeredDockTabsInjectable;
