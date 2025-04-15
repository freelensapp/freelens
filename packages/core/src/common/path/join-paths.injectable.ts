/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "path";
import { getInjectable } from "@ogre-tools/injectable";

export type JoinPaths = (...args: string[]) => string;

const joinPathsInjectable = getInjectable({
  id: "join-paths",
  instantiate: (): JoinPaths => path.join,

  // This causes side effect e.g. Windows uses different separator than e.g. linux
  causesSideEffects: true,
});

export default joinPathsInjectable;
