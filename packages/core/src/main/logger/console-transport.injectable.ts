/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerTransportInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { format, transports } from "winston";
import { ConsoleFormat } from "./console-format";
import logLevelInjectable from "./level.injectable";

const consoleLoggerTransportInjectable = getInjectable({
  id: "console-logger-transport",
  instantiate: (di) =>
    new transports.Console({
      handleExceptions: false,
      level: di.inject(logLevelInjectable),
      format: format.combine(
        format.colorize({ level: true, message: false }),
        format.padLevels(),
        format.ms(),
        new ConsoleFormat({
          showMeta: true,
          inspectOptions: {
            depth: 4,
            colors: true,
            maxArrayLength: 10,
            breakLength: 120,
            compact: Infinity,
          },
        }),
      ),
    }),
  injectionToken: loggerTransportInjectionToken,
  decorable: false,
});

export default consoleLoggerTransportInjectable;
