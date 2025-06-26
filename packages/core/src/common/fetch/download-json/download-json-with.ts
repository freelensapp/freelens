/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { AsyncResult } from "@freelensapp/utilities";

import type { Fetch } from "../fetch.injectable";
import type { NodeFetch, NodeFetchResponse } from "../node-fetch.injectable";

export interface DownloadJsonOptions {
  signal?: AbortSignal | null | undefined;
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

export const downloadJsonWith =
  (fetch: Fetch | NodeFetch): DownloadJson =>
  async (url, opts) => {
    let result: Response | NodeFetchResponse;

    try {
      // MDN fetch and Node fetch have incompatible types
      result = await fetch(url, opts as any);
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
