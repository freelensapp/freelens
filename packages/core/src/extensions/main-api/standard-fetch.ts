/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { Fetch, FetchRequestInit } from "@freelensapp/json-api";

/**
 * The standard `fetch` of the environment an extension's main code compiles
 * in: the one `@types/node` declares. Naming the global rather than that
 * declaration imposes `@types/node` on no consumer of the published API.
 */
export type StandardFetch = typeof globalThis.fetch;

type StandardInput = string | URL | Request;

// The init as the host's client takes it. `duplex` is required by undici for
// a streaming body, and `dispatcher` is what an extension's init must not set.
type HostInit = RequestInit & { duplex?: "half"; dispatcher?: unknown };

// Checked by shape rather than with `instanceof`: the `Request` an extension or
// a library creates is the one of Node's built-in undici, which the undici
// package the host's client runs on does not recognise as its own.
const isRequest = (input: StandardInput): input is Request =>
  typeof input === "object" &&
  !(input instanceof URL) &&
  typeof (input as Request).url === "string" &&
  typeof (input as Request).method === "string";

const initOfRequest = (request: Request): HostInit => {
  const headers: [string, string][] = [];

  request.headers.forEach((value, name) => {
    headers.push([name, value]);
  });

  return {
    method: request.method,
    headers,
    body: request.body,
    signal: request.signal,
    redirect: request.redirect,
    ...(request.body ? { duplex: "half" as const } : {}),
  };
};

// A member given as `undefined` counts as absent, as in the standard, so it
// does not override the member of the `Request`.
const definedMembersOf = (init: RequestInit | undefined): HostInit =>
  Object.fromEntries(Object.entries(init ?? {}).filter(([, value]) => value !== undefined));

/**
 * The host's `fetch` of the main process, typed as the standard one.
 *
 * The host's client is the undici package's `fetch`, which turns a `Request`
 * of Node's built-in undici into the string `"[object Request]"`, so a
 * `Request` input is translated here: its URL is passed as the input, and its
 * `method`, `headers`, `body`, `signal` and `redirect` as the init, with
 * `duplex: "half"` when it has a body. The caller's init applies on top, member
 * by member, as it does for the standard `fetch`.
 *
 * `dispatcher` is dropped from the caller's init. The host's client sends the
 * request through the dispatcher that applies the user's proxy and certificate
 * settings, and an extension's dispatcher would replace it.
 *
 * The response is undici's full `Response`, handed over as it is and asserted
 * once, here.
 */
export const asStandardFetch =
  (fetch: Fetch): StandardFetch =>
  (input, init) => {
    const [url, requestInit] = isRequest(input) ? [input.url, initOfRequest(input)] : [input, {}];
    const { dispatcher: _dispatcher, ...merged }: HostInit = { ...requestInit, ...definedMembersOf(init) };

    return fetch(url, merged as FetchRequestInit) as Promise<unknown> as Promise<Response>;
  };
