/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverrideForFunction } from "@freelensapp/test-utils";
import checkForPlatformUpdatesInjectable from "./check-for-platform-updates.injectable";

export default getGlobalOverrideForFunction(checkForPlatformUpdatesInjectable);
