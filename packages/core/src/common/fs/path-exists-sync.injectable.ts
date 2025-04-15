/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import fsInjectable from "./fs.injectable";

const pathExistsSyncInjectable = getInjectable({
  id: "path-exists-sync",
  instantiate: (di) => di.inject(fsInjectable).pathExistsSync,
});

export default pathExistsSyncInjectable;
