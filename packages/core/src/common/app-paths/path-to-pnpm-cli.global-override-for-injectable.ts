/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import pathToPnpmCliInjectable from "./path-to-pnpm-cli.injectable";

export default getGlobalOverride(pathToPnpmCliInjectable, () => "node_modules/pnpm/bin/pnpm.cjs");
