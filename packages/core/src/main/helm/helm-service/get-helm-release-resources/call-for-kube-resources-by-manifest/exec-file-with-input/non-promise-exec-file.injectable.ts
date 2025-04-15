/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { execFile } from "child_process";
import { getInjectable } from "@ogre-tools/injectable";

const nonPromiseExecFileInjectable = getInjectable({
  id: "non-promise-exec-file",
  instantiate: () => execFile,
  causesSideEffects: true,
});

export default nonPromiseExecFileInjectable;
