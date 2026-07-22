/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerTransportInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import BrowserConsoleImport from "winston-transport-browserconsole";

// `winston-transport-browserconsole` is a CommonJS module that exports its class
// via `exports.default` (`{ __esModule: true, default: BrowserConsole }`). Under
// the Node-mode ESM interop that electron-vite v6 + Vite 8 (rolldown) emit for
// the renderer, a default import — and even `import { default as ... }` — binds
// to the whole `module.exports` object, leaving the class one `.default` deeper,
// so `new BrowserConsole()` throws "BrowserConsole is not a constructor". Unwrap
// the extra `.default` when present. (ansi_up 6.x avoids this by being native
// ESM; this transport is CommonJS-only, so the unwrap is unavoidable here.)
const BrowserConsole = ((BrowserConsoleImport as unknown as { default?: typeof BrowserConsoleImport }).default ??
  BrowserConsoleImport) as typeof BrowserConsoleImport;

const browserLoggerTransportInjectable = getInjectable({
  id: "browser-logger-transport",
  instantiate: () => new BrowserConsole(),
  injectionToken: loggerTransportInjectionToken,
});

export default browserLoggerTransportInjectable;
