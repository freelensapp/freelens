/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export { loggerFeature } from "./src/feature";
/** @deprecated Use specific injectionToken, eg. logErrorInjectionToken */
export {
  logDebugInjectionToken,
  logErrorInjectionToken,
  loggerInjectionToken,
  logInfoInjectionToken,
  logSillyInjectionToken,
  logWarningInjectionToken,
} from "./src/logger.injectable";
/** @deprecated Use specific injectionToken, eg. logErrorInjectionToken */
export { prefixedLoggerInjectable } from "./src/prefixed-logger.injectable";
export { registerInjectables as registerLoggerInjectables } from "./src/register-injectables";
export { loggerTransportInjectionToken } from "./src/transports";
export { winstonLoggerInjectable } from "./src/winston-logger.injectable";

export type { LogFunction, Logger } from "./src/logger.injectable";
