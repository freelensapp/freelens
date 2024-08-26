/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import maximizeWindowInjectable from "./maximize-window.injectable";
import { getGlobalOverrideForFunction } from "@freelensapp/test-utils";

export default getGlobalOverrideForFunction(maximizeWindowInjectable);
