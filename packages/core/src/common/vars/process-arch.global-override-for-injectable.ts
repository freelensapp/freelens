/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import processArchInjectable from "./process-arch.injectable";

export default getGlobalOverride(processArchInjectable, () => "x64");
