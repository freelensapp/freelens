/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import fsInjectable from "./fs.injectable";
import type { Stats } from "fs";

export type Stat = (path: string) => Promise<Stats>;

const statInjectable = getInjectable({
  id: "stat",
  instantiate: (di): Stat => di.inject(fsInjectable).stat,
});

export default statInjectable;
