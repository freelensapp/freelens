/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "path";
import { getGlobalOverride } from "@freelens/test-utils";
import parsePathInjectable from "./parse.injectable";

export default getGlobalOverride(parsePathInjectable, () => path.posix.parse);
