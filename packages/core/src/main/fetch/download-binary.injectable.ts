/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { withStallTimeout, withTimeout } from "../../common/fetch/timeout-controller";
import proxyFetchInjectable from "./proxy-fetch.injectable";

import type { FetchRequestInit, FetchResponse } from "@freelensapp/json-api";
import type { AsyncResult } from "@freelensapp/utilities";

/**
 * The payload of {@link downloadBinaryChannel}, so it must stay serializable.
 */
export interface DownloadBinaryOptions {
  timeout?: number;
  /**
   * The most bytes the body may have. A `content-length` over it fails the download before the
   * body is read, and the body is counted as it arrives, the download aborted as soon as it passes
   * the limit: the header may be missing or wrong.
   */
  maxSize?: number;
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

/**
 * The error of a download that passed its `maxSize`.
 */
export const getDownloadTooLargeError = (maxSize: number) => `The response is larger than ${maxSize} bytes`;

export type DownloadBinary = (url: string, opts?: DownloadBinaryLocalOptions) => AsyncResult<Buffer, string>;

const downloadBinaryInjectable = getInjectable({
  id: "download-binary",
  instantiate: (di): DownloadBinary => {
    const fetch = di.inject(proxyFetchInjectable);

    return async (url, opts) => {
      let result: FetchResponse;
      const fetchOpts = {} as FetchRequestInit;
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

        const { onProgress, maxSize } = opts ?? {};
        const isTooLarge = (size: number) => maxSize !== undefined && size > maxSize;
        const tooLarge = () => ({
          callWasSuccessful: false as const,
          error: getDownloadTooLargeError(maxSize ?? 0),
        });
        const contentLength = Number(result.headers.get("content-length"));
        const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined;

        if (total !== undefined && isTooLarge(total)) {
          await result.body?.cancel().catch(() => undefined);

          return tooLarge();
        }

        // The body is streamed to report progress, to re-arm the stall timer
        // on every chunk, or to stop at the size limit; `arrayBuffer()` would
        // allow none of these.
        if ((!onProgress && !stall && maxSize === undefined) || !result.body) {
          try {
            const response = Buffer.from(await result.arrayBuffer());

            return isTooLarge(response.length) ? tooLarge() : { callWasSuccessful: true, response };
          } catch (error) {
            return {
              callWasSuccessful: false,
              error: String(error),
            };
          }
        }
        const chunks: Buffer[] = [];
        let transferred = 0;

        // Reported as soon as the headers land, so that the indicator appears
        // before the first chunk does.
        onProgress?.({ transferred, total });

        try {
          const reader = result.body.getReader();

          for (;;) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const buffer = Buffer.from(value);

            transferred += buffer.length;

            if (isTooLarge(transferred)) {
              await reader.cancel().catch(() => undefined);

              return tooLarge();
            }

            chunks.push(buffer);
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
