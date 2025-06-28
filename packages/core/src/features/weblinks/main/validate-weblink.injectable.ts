/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { chainSignal } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import { withTimeout } from "../../../common/fetch/timeout-controller";
import nodeFetchInjectable from "../../../main/fetch/node-fetch.injectable";

export type ValidateWeblink = (url: string, signal: AbortSignal) => Promise<"available" | "unavailable">;

const validateWeblinkInjectable = getInjectable({
  id: "validate-weblink",
  instantiate: (di): ValidateWeblink => {
    const fetch = di.inject(nodeFetchInjectable);

    return async (url, signal) => {
      const timeout = withTimeout(20_000);

      chainSignal(timeout, signal);

      try {
        const res = await fetch(url, {
          signal: timeout.signal,
        });

        if (res.status >= 200 && res.status < 500) {
          return "available";
        }
      } catch {
        // ignore
      } finally {
        timeout.abort();
      }

      return "unavailable";
    };
  },
  causesSideEffects: true,
});

export default validateWeblinkInjectable;
