/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { lensBuildEnvironmentInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";

const lensBuildEnvironmentInjectable = getInjectable({
  id: "lens-build-environment",
  instantiate: () => "unknown",
  injectionToken: lensBuildEnvironmentInjectionToken,
});

export default lensBuildEnvironmentInjectable;
