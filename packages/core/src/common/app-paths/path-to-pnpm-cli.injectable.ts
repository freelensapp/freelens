/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const pathToPnpmCliInjectable = getInjectable({
  id: "path-to-pnpm-cli",
  instantiate: () => __non_webpack_require__.resolve("pnpm"),
  causesSideEffects: true,
});

export default pathToPnpmCliInjectable;
