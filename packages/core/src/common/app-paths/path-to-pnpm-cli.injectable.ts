/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const pathToPnpmCliInjectable = getInjectable({
  id: "path-to-pnpm-cli",
  instantiate: () => {
    // Ugly trick to get the path in renderer process
    const req = eval("require");
    const pnpmPackageJson = req.resolve("pnpm");

    return `${pnpmPackageJson.substring(0, pnpmPackageJson.indexOf("package.json"))}bin/pnpm.cjs`;
  },
  causesSideEffects: true,
});

export default pathToPnpmCliInjectable;
