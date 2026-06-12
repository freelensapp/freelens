/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import path from "path";
import joinPathsInjectable from "./join-paths.injectable";

export default getGlobalOverride(joinPathsInjectable, () => path.posix.join);
