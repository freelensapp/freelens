/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "path";
import { getInjectable } from "@ogre-tools/injectable";

const parsePathInjectable = getInjectable({
  id: "parse-path",
  instantiate: () => path.parse,
  causesSideEffects: true,
});

export default parsePathInjectable;
