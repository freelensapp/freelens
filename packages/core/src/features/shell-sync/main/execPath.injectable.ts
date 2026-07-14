/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import process from "node:process";
import { getInjectable } from "@ogre-tools/injectable";

const processExecPathInjectable = getInjectable({
  id: "process-exec-path",
  instantiate: () => process.execPath,
  causesSideEffects: true,
});

export default processExecPathInjectable;
