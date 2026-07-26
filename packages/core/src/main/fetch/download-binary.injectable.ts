/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { withStallTimeout, withTimeout } from "../../common/fetch/timeout-controller";
import proxyFetchInjectable from "./proxy-fetch.injectable";

import type { AsyncResult } from "@freelensapp/utilities";

import type { NodeFetchRequestInit, NodeFetchResponse } from "../../common/fetch/node-fetch.injectable";

/**
 * The payload of {@link downloadBinaryChannel}, so it must stay serializable.
 */
export interface DownloadBinaryOptions {
  timeout?: number;
}

export interface DownloadProgress {
  transferred: number;
  /** the value of the `content-length` header, when the server sent one */
  total?: number;
}

/**
 * The options only a caller within the same process can pass, because they are
 * not serializable.
 */
export interface DownloadBinaryLocalOptions extends DownloadBinaryOptions {
  onProgress?: (progress: DownloadProgress) => void;
  /** abort when no bytes arrive for this long (headers included) */
  stallTimeout?: number;
}

export type DownloadBinary = (url: string, opts?: DownloadBinaryLocalOptions) => AsyncResult<Buffer, string>;

const downloadBinaryInjectable = getInjectable({
  id: "download-binary",
  instantiate: (di): DownloadBinary => {
    const fetch = di.inject(proxyFetchInjectable);

    return async (url, opts) => {
      let result: NodeFetchResponse;
      const fetchOpts = {} as NodeFetchRequestInit;
      const stall = opts?.stallTimeout ? withStallTimeout(opts.stallTimeout) : undefined;
      const signals = [opts?.timeout ? withTimeout(opts.timeout).signal : undefined, stall?.controller.signal].filter(
        (signal) => signal !== undefined,
      );

      if (signals.length > 0) {
        fetchOpts.signal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);
      }

      try {
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

        const { onProgress } = opts ?? {};

        // The body is streamed either to report progress or to re-arm the
        // stall timer on every chunk; `arrayBuffer()` would expose neither.
        if ((!onProgress && !stall) || !result.body) {
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
        }

        const contentLength = Number(result.headers.get("content-length"));
        const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined;
        const chunks: Buffer[] = [];
        let transferred = 0;

        // Reported as soon as the headers land, so that the indicator appears
        // before the first chunk does.
        onProgress?.({ transferred, total });

        try {
          for await (const chunk of result.body) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

            chunks.push(buffer);
            transferred += buffer.length;
            stall?.progressed();
            onProgress?.({ transferred, total });
          }
        } catch (error) {
          return {
            callWasSuccessful: false,
            error: String(error),
          };
        }

        return {
          callWasSuccessful: true,
          response: Buffer.concat(chunks),
        };
      } finally {
        stall?.done();
      }
    };
  },
});

export default downloadBinaryInjectable;
