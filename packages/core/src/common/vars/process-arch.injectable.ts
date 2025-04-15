/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

const processArchInjectable = getInjectable({
  id: "process-arch",
  instantiate: () => process.arch as string,
  causesSideEffects: true,
});

export default processArchInjectable;
