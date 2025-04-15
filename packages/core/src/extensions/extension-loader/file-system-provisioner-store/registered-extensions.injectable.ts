/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { LensExtensionId } from "@freelensapp/legacy-extensions";
import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

export const registeredExtensionsInjectable = getInjectable({
  id: "registered-extensions",
  instantiate: () => observable.map<LensExtensionId, string>(),
});
