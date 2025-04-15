/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestInit, Response } from "@freelensapp/node-fetch";
import type { AsyncResult } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import fetchInjectable from "./fetch.injectable";

export interface DownloadBinaryOptions {
  signal?: AbortSignal | null | undefined;
}

export type DownloadBinary = (url: string, opts?: DownloadBinaryOptions) => AsyncResult<Buffer, string>;

const downloadBinaryInjectable = getInjectable({
  id: "download-binary",
  instantiate: (di): DownloadBinary => {
    const fetch = di.inject(fetchInjectable);

    return async (url, opts) => {
      let result: Response;

      try {
        result = await fetch(url, opts as RequestInit);
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
          response: await result.buffer(),
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

export default downloadBinaryInjectable;
