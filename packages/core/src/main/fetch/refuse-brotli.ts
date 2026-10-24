/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { IncomingHttpHeaders } from "node:http";

import type { Dispatcher } from "undici";

/**
 * Mitigation for CVE-2026-111497 ("Node2Shell"), an out-of-bounds write in the
 * Brotli decoder bundled with Node.js, fixed in Node 22.23.4, 24.22.1 and
 * 26.12.1. The Node of Electron builds that decoder from Node's own copy, and
 * undici's `fetch` decodes a `Content-Encoding: br` response with it even when
 * the request asked for no Brotli. The renderer is not affected: Chromium has
 * its own, fixed copy.
 *
 * undici's `fetch` asks for Brotli on every HTTPS request, so a request goes
 * out without `br` in its `Accept-Encoding`, and a server that supports Brotli
 * answers with another coding. A response that uses Brotli anyway is refused
 * before any of it is decoded.
 *
 * TODO: remove with the Electron update whose Node is 24.22.1 or newer, as
 * its release notes list it: this file and its test, `refuseBrotli` in
 * `dispatcherFor` of `cluster/freelens-k8s-proxy-target.ts`, in
 * `freelens-proxy-dispatcher.injectable.ts` and in `https-agent.injectable.ts`,
 * `withBrotliRefused` in `undici-fetch.injectable.ts`, and the Brotli test of
 * `freelens-proxy/freelens-proxy.test.ts`.
 */
export class BrotliRefusedError extends Error {
  constructor() {
    super("refused a Brotli-encoded response (CVE-2026-111497)");
    this.name = "BrotliRefusedError";
  }
}

type DispatchHeaders = Dispatcher.DispatchOptions["headers"];

/** Whether a content coding of a header, with any `;q=` weight, is `br`. */
const isBrotli = (coding: string) => coding.split(";")[0].trim().toLowerCase() === "br";

const isAcceptEncoding = (name: unknown) => String(name).toLowerCase() === "accept-encoding";

/**
 * The value of `Accept-Encoding` without `br`, or `identity` when nothing else
 * is left: without the header at all, a server may pick any coding.
 */
const acceptedWithoutBrotli = (value: unknown): string => {
  const codings = (Array.isArray(value) ? value.join(",") : String(value))
    .split(",")
    .map((coding) => coding.trim())
    .filter((coding) => coding !== "" && !isBrotli(coding));

  return codings.length > 0 ? codings.join(", ") : "identity";
};

/**
 * Returns the headers with `br` taken out of `Accept-Encoding`, keeping the
 * header shape (flat array, iterable of pairs, or object) undici was given.
 */
const withoutBrotliAccepted = (headers: DispatchHeaders): DispatchHeaders => {
  if (!headers) {
    return headers;
  }

  if (Array.isArray(headers)) {
    return headers.map((entry, index) =>
      index % 2 === 1 && isAcceptEncoding(headers[index - 1]) ? acceptedWithoutBrotli(entry) : entry,
    ) as DispatchHeaders;
  }

  if (Symbol.iterator in headers) {
    return [...(headers as Iterable<[string, unknown]>)].map(([name, value]) =>
      isAcceptEncoding(name) ? [name, acceptedWithoutBrotli(value)] : [name, value],
    ) as unknown as DispatchHeaders;
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) =>
      isAcceptEncoding(name) && value !== undefined ? [name, acceptedWithoutBrotli(value)] : [name, value],
    ),
  );
};

const usesBrotli = (headers: IncomingHttpHeaders): boolean => {
  const value = headers["content-encoding"];
  const values: string[] = Array.isArray(value) ? value : value === undefined ? [] : [value];

  return values.some((entry) => entry.split(",").some(isBrotli));
};

/**
 * Takes `br` out of the `Accept-Encoding` of every request, and aborts every
 * response whose `Content-Encoding` includes it anyway, before its body
 * reaches `fetch`. The caller then sees a failed request.
 */
export const refuseBrotli: Dispatcher.DispatcherComposeInterceptor = (dispatch) => (options, handler) =>
  dispatch(
    { ...options, headers: withoutBrotliAccepted(options.headers) },
    {
      onRequestStart: (controller, context) => handler.onRequestStart?.(controller, context),
      onRequestUpgrade: (controller, statusCode, headers, socket) =>
        handler.onRequestUpgrade?.(controller, statusCode, headers, socket),
      onResponseStart: (controller, statusCode, headers, statusMessage) => {
        if (usesBrotli(headers)) {
          controller.abort(new BrotliRefusedError());

          return;
        }

        handler.onResponseStart?.(controller, statusCode, headers, statusMessage);
      },
      onResponseData: (controller, chunk) => handler.onResponseData?.(controller, chunk),
      onResponseEnd: (controller, trailers) => handler.onResponseEnd?.(controller, trailers),
      onResponseError: (controller, error) => handler.onResponseError?.(controller, error),
    },
  );

const refusing = new WeakMap<Dispatcher, Dispatcher>();

/**
 * `dispatcher` with {@link refuseBrotli} composed onto it. `compose()` makes a
 * new dispatcher every time, so the result is kept per dispatcher.
 */
export const withBrotliRefused = (dispatcher: Dispatcher): Dispatcher => {
  let composed = refusing.get(dispatcher);

  if (!composed) {
    composed = dispatcher.compose(refuseBrotli);
    refusing.set(dispatcher, composed);
  }

  return composed;
};
