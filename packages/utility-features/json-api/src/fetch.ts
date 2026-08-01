/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * The request/response contract shared by both fetch implementations Freelens
 * runs.
 *
 * The two processes reach lens-proxy differently and cannot share one client:
 *
 * - the **renderer** uses Chromium's `fetch`. Its frame is served from
 *   `https://<clusterId>.renderer.freelens.app:<port>`, which Chromium's
 *   host-resolver rules map to 127.0.0.1 and whose certificate the session
 *   already trusts, so a request to the frame's own origin is routed to the
 *   right cluster by the `Host` header the browser sends on its own.
 * - the **main** process uses undici, because Node resolves no such hostname:
 *   it connects to 127.0.0.1 and has to carry the routing `Host` header
 *   itself, over a socket that trusts the lens-proxy certificate.
 *
 * Both are WHATWG `fetch`, but they are *not* the same class: Chromium's
 * `Response` and undici's are structurally compatible and nominally distinct.
 * Naming either one here would make this contract a statement about a
 * particular runtime, and would force every consumer — including an extension
 * compiling on its own — to load the library that declares it.
 *
 * So the types below are **structural**: a supertype of both implementations,
 * covering exactly the members Freelens uses. `AbortSignal` and
 * `ReadableStream` are left as ambient names because `lib.dom` and
 * `@types/node` both declare them, so they cost a consumer nothing that
 * inventing stand-ins would save.
 */

/** The part of `Headers` a response is read through. */
export interface FetchResponseHeaders {
  get(name: string): string | null;
}

/** The part of `Headers` an instance passed as request headers is read through. */
export interface FetchRequestHeaders extends FetchResponseHeaders {
  forEach(callback: (value: string, name: string, parent: any) => void): void;
}

/**
 * Request headers in any of the three shapes `fetch` accepts: a list of
 * name/value pairs, a `Headers`-like instance, or a plain record.
 */
export type FetchHeadersInit = string[][] | FetchRequestHeaders | Record<string, string>;

/**
 * Request bodies Freelens sends. Deliberately narrower than the DOM's
 * `BodyInit`: `Blob`, `FormData` and `URLSearchParams` name types only
 * `lib.dom` declares, and nothing here sends them.
 */
export type FetchBodyInit = string | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>;

export interface FetchRequestInit {
  method?: string;
  headers?: FetchHeadersInit;
  body?: FetchBodyInit | null;
  signal?: AbortSignal | null;
}

export interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: FetchResponseHeaders;
  readonly body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type Fetch = (url: string | URL, init?: FetchRequestInit) => Promise<FetchResponse>;
