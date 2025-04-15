/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalOverride } from "@freelensapp/test-utils";
import periodicalCheckForUpdatesInjectable from "./periodical-check-for-updates.injectable";

export default getGlobalOverride(periodicalCheckForUpdatesInjectable, () => ({
  start: () => {},
  stop: () => {},
  started: false,
}));
