/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import fsInjectable from "./fs.injectable";

/**
 * Resolve a path to what it actually points at, following every symbolic link
 * along the way. Rejects with ENOENT when it points at nothing.
 */
export type RealPath = (path: string) => Promise<string>;

const realPathInjectable = getInjectable({
  id: "real-path",
  instantiate: (di): RealPath => di.inject(fsInjectable).realpath,
});

export default realPathInjectable;
