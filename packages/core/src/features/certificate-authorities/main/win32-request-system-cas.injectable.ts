/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger/dist";
import { getInjectable } from "@ogre-tools/injectable";
import winCa from "win-ca/api";
import { platformSpecificRequestSystemCAsInjectionToken } from "../common/request-system-cas-token";

const win32RequestSystemCAsInjectable = getInjectable({
  id: "win32-request-system-cas",
  instantiate: (di) => ({
    platform: "win32" as const,
    instantiate: () => {
      const logger = di.inject(loggerInjectionToken);
      return async () => {
        const certs = [] as string[];
        for await (let cert of winCa({ format: winCa.der2.pem, generator: true, async: true })) {
          certs.push(cert.toString());
        }
        logger.info(`[INJECT-CAS]: ${certs.length} CAs retrieved from system.`);
        return certs;
      };
    },
  }),
  causesSideEffects: true,
  injectionToken: platformSpecificRequestSystemCAsInjectionToken,
});

export default win32RequestSystemCAsInjectable;
