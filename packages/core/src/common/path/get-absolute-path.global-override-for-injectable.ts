/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "path";
import { getGlobalOverride } from "@freelensapp/test-utils";
import getAbsolutePathInjectable from "./get-absolute-path.injectable";

export default getGlobalOverride(getAbsolutePathInjectable, () => path.posix.resolve);
