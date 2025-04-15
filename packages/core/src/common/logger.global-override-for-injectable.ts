/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getGlobalOverride } from "@freelensapp/test-utils";

export default getGlobalOverride(loggerInjectionToken, () => ({
  warn: () => {},
  debug: () => {},
  error: () => {},
  info: () => {},
  silly: () => {},
}));
