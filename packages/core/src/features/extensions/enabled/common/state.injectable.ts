/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { LensExtensionId } from "@freelensapp/legacy-extensions";

export interface LensExtensionState {
  enabled?: boolean;
  name: string;
}

const enabledExtensionsStateInjectable = getInjectable({
  id: "enabled-extensions-state",
  instantiate: () => observable.map<LensExtensionId, LensExtensionState>(),
});

export default enabledExtensionsStateInjectable;
