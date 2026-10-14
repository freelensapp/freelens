/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Fetch, FetchRequestInit } from "@freelensapp/json-api";

/**
 * The standard `fetch` of the environment an extension compiles in: the one
 * `@types/node` declares in main, the DOM's in the renderer. Naming the global
 * rather than either declaration imposes neither on the published API.
 */
export type StandardFetch = typeof globalThis.fetch;

// The init of the standard `fetch` is wider than `FetchRequestInit`, in its
// body and its headers, and the implementations of both processes take it as
// it is.
const withoutDispatcher = (init: RequestInit | undefined): FetchRequestInit | undefined => {
  if (!init || !("dispatcher" in init)) {
    return init as FetchRequestInit | undefined;
  }

  const { dispatcher: _dispatcher, ...rest } = init as RequestInit & { dispatcher?: unknown };

  return rest as FetchRequestInit;
};

/**
 * The host's `fetch`, typed as the standard one, for a bundled library that
 * takes a `fetch` option typed with the standard `fetch`.
 *
 * Both processes really answer with a full `Response` (undici's in main,
 * Chromium's in the renderer), so the response is handed over as it is, and
 * asserted once, here. What the structural contract leaves out of the request
 * is handled rather than assumed:
 *
 * - a `Request` as the input is refused, because its method, headers and body
 *   would be lost; the call rejects with a `TypeError`;
 * - an init is passed on as it is, apart from `dispatcher`: it is not a field
 *   of the standard, and in main it would replace the one that applies the
 *   user's proxy and certificate settings.
 */
export const asStandardFetch =
  (fetch: Fetch): StandardFetch =>
  (input, init) => {
    if (typeof input !== "string" && !(input instanceof URL)) {
      return Promise.reject(
        new TypeError(
          "Util.standardFetch takes a URL, as a string or a URL object, and not a Request: pass the Request's URL and its init instead",
        ),
      );
    }

    return fetch(input, withoutDispatcher(init)) as Promise<unknown> as Promise<Response>;
  };
