/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { withTimeout } from "../../common/fetch/timeout-controller";
import proxyFetchInjectable from "./proxy-fetch.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { NodeFetchRequestInit, NodeFetchResponse } from "./node-fetch.injectable";

export interface DownloadBinaryOptions {
  timeout?: number;
}

export type DownloadBinary = (url: string, opts?: DownloadBinaryOptions) => AsyncResult<Buffer, string>;

const downloadBinaryInjectable = getInjectable({
  id: "download-binary",
  instantiate: (di): DownloadBinary => {
    const fetch = di.inject(proxyFetchInjectable);

    return async (url, opts) => {
      let result: NodeFetchResponse;
      const fetchOpts = {} as NodeFetchRequestInit;

      if (opts?.timeout) {
        const controller = withTimeout(opts.timeout);
        fetchOpts.signal = controller.signal;
      }

      try {
        result = await fetch(url, fetchOpts);
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

export default downloadBinaryInjectable;
