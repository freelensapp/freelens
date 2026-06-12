/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { withTimeout } from "../../common/fetch/timeout-controller";
import proxyFetchInjectable from "./proxy-fetch.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { NodeFetchRequestInit, NodeFetchResponse } from "../../common/fetch/node-fetch.injectable";

export interface DownloadJsonOptions {
  timeout?: number;
}

export type DownloadJson = (url: string, opts?: DownloadJsonOptions) => AsyncResult<unknown, string>;

function errorString(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const obj = error as any;
    if (obj?.status || obj?.statusText) {
      return [obj?.status, obj?.statusText].filter((a) => !!a).join(": ");
    }
    if (obj?.message) {
      return obj?.message;
    }
    return String(obj);
  }
  return "Uknown error";
}

const downloadJsonInjectable: Injectable<DownloadJson, unknown, void> = getInjectable({
  id: "download-json",
  instantiate: (di) => {
    const proxyFetch = di.inject(proxyFetchInjectable);

    return async (url, opts) => {
      let result: NodeFetchResponse;
      const fetchOpts = {} as NodeFetchRequestInit;

      if (opts?.timeout) {
        const controller = withTimeout(opts.timeout);
        fetchOpts.signal = controller.signal;
      }

      try {
        // MDN fetch and Node fetch have incompatible types
        result = await proxyFetch(url, fetchOpts);
      } catch (error) {
        return {
          callWasSuccessful: false,
          error: errorString(error),
        };
      }

      if (result.status < 200 || 300 <= result.status) {
        return {
          callWasSuccessful: false,
          error: errorString(result),
        };
      }

      try {
        return {
          callWasSuccessful: true,
          response: await result.json(),
        };
      } catch (error) {
        return {
          callWasSuccessful: false,
          error: errorString(error),
        };
      }
    };
  },
});

export default downloadJsonInjectable;
