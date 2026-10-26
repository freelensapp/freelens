/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import * as verkit from "verkit";
import packageJson from "../../../package.json";

const extensionApiVersionInjectable = getInjectable({
  id: "extension-api-version",
  instantiate: () => {
    const { major, minor, patch } = verkit.parse(packageJson.version);

    return `${major}.${minor}.${patch}`;
  },
  causesSideEffects: true,
});

export default extensionApiVersionInjectable;
