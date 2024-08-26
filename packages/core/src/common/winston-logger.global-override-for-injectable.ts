/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type winston from "winston";
import { getGlobalOverride } from "@freelensapp/test-utils";
import { noop } from "@freelensapp/utilities";
import { winstonLoggerInjectable } from "@freelensapp/logger";

export default getGlobalOverride(winstonLoggerInjectable, () => ({
  log: noop,
  add: noop,
  remove: noop,
  clear: noop,
  close: noop,

  warn: noop,
  debug: noop,
  error: noop,
  info: noop,
  silly: noop,
}) as winston.Logger);
