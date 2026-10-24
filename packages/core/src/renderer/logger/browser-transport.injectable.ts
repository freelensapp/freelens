/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerTransportInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { BrowserConsoleTransport } from "./browser-console-transport";

const browserLoggerTransportInjectable = getInjectable({
  id: "browser-logger-transport",
  instantiate: () => new BrowserConsoleTransport(),
  injectionToken: loggerTransportInjectionToken,
});

export default browserLoggerTransportInjectable;
