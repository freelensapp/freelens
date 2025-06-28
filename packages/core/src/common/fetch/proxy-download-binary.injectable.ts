/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import proxyFetchInjectable from "./proxy-fetch.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { Response } from "./node-fetch.injectable";

export interface ProxyDownloadBinaryOptions {
  signal?: AbortSignal | null | undefined;
}

export type ProxyDownloadBinary = (url: string, opts?: ProxyDownloadBinaryOptions) => AsyncResult<Buffer, string>;

const proxyDownloadBinaryInjectable = getInjectable({
  id: "proxy-download-binary",
  instantiate: (di): ProxyDownloadBinary => {
    const fetch = di.inject(proxyFetchInjectable);

    return async (url, opts) => {
      let result: Response;

      try {
        result = await fetch(url, opts);
      } catch (error) {
        return {
          callWasSuccessful: false,
          error: String(error),
        };
      }

      if (result.status < 200 || 300 <= result.status) {
        return {
          callWasSuccessful: false,
          error: result.statusText,
        };
      }

      try {
        return {
          callWasSuccessful: true,
          response: Buffer.from(await result.arrayBuffer()),
        };
      } catch (error) {
        return {
          callWasSuccessful: false,
          error: String(error),
        };
      }
    };
  },
});

export default proxyDownloadBinaryInjectable;
