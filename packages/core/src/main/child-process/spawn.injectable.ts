/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { spawn } from "child_process";
import { getInjectable } from "@ogre-tools/injectable";

export type Spawn = typeof spawn;

const spawnInjectable = getInjectable({
  id: "spawn",

  instantiate: (): Spawn => spawn,
  causesSideEffects: true,
});

export default spawnInjectable;
