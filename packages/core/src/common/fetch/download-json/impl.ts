/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { RequestInit, Response } from "@freelensapp/node-fetch";
import type { AsyncResult } from "@freelensapp/utilities";

import type { Fetch } from "../fetch.injectable";

export interface DownloadJsonOptions {
  signal?: AbortSignal | null | undefined;
}

export type DownloadJson = (url: string, opts?: DownloadJsonOptions) => AsyncResult<unknown, string>;

export const downloadJsonWith =
  (fetch: Fetch): DownloadJson =>
  async (url, opts) => {
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
        response: await result.json(),
      };
    } catch (error) {
      return {
        callWasSuccessful: false,
        error: String(error),
      };
    }
  };
