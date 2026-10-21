/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { chunk } from "es-toolkit";
import { Agent, fetch as undiciFetch } from "undici";

import type { ServerOptions } from "http-proxy-3";
import type { Dispatcher } from "undici";

/**
 * freelens-k8s-proxy allows 1000 concurrent streams on an HTTP/2 connection,
 * and undici opens no more than 100 on one unless told otherwise. Every open
 * watch is a stream, so at the default a cluster with many of them would be
 * spread over several connections.
 */
const maxConcurrentStreams = 1000;

/**
 * The request headers that are not forwarded to freelens-k8s-proxy:
 *
 * - the ones that describe the connection to freelens-proxy rather than the
 *   request (RFC 9110, section 7.6.1), which undici refuses to send anyway;
 * - `expect`, which freelens-proxy has already answered, and which undici
 *   does not support;
 * - `host`, which is set below;
 * - `accept-encoding`. `fetch` decodes a compressed response, but leaves its
 *   `content-encoding` and `content-length` on the headers, which http-proxy-3
 *   then sends to the client with the decoded body. A request without the
 *   header gets no compressed response: the Go transport of freelens-k8s-proxy
 *   asks the API server for gzip itself and decodes it, so the hop to the API
 *   server is still compressed and this one on the loopback never is.
 */
const notForwarded = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "te",
  "transfer-encoding",
  "upgrade",
  "expect",
  "host",
  "accept-encoding",
]);

type DispatchHeaders = Dispatcher.DispatchOptions["headers"];

const entriesOf = (headers: DispatchHeaders): [string, unknown][] => {
  if (!headers) {
    return [];
  }

  if (Array.isArray(headers)) {
    return chunk(headers, 2) as [string, string][];
  }

  if (Symbol.iterator in headers) {
    return [...(headers as Iterable<[string, unknown]>)];
  }

  return Object.entries(headers);
};

const forwardedHeaders = (headers: DispatchHeaders, host: string) => {
  const entries = entriesOf(headers);
  // A `Connection` header can name further headers that are only meant for
  // the connection it came over
  const namedByConnection = new Set(
    entries
      .filter(([name]) => name.toLowerCase() === "connection")
      .flatMap(([, value]) => String(value).split(","))
      .map((token) => token.trim().toLowerCase()),
  );
  const forwarded: Record<string, string | string[]> = {};

  for (const [name, value] of entries) {
    const lowerCaseName = name.toLowerCase();

    if (value == null || notForwarded.has(lowerCaseName) || namedByConnection.has(lowerCaseName)) {
      continue;
    }

    forwarded[name] = value as string | string[];
  }

  forwarded.host = host;

  return forwarded;
};

/**
 * `fetch` drops a `Host` header, as a browser does, so it is set here, below
 * `fetch`, where undici sends it as `:authority` over HTTP/2.
 */
const forwardTo =
  (host: string): Dispatcher.DispatcherComposeInterceptor =>
  (dispatch) =>
  (options, handler) =>
    dispatch({ ...options, headers: forwardedHeaders(options.headers, host) }, handler);

/**
 * The connection pool to one freelens-k8s-proxy process, which trusts the
 * certificate it serves. undici negotiates HTTP/2 with it through ALPN, so all
 * requests of a cluster, its watches included, share one connection, and
 * falls back to HTTP/1.1 against a proxy that does not offer HTTP/2.
 */
export const createFreelensK8sProxyAgent = (ca: string) =>
  new Agent({
    connect: { ca },
    h2Options: { maxConcurrentStreams },
  });

/**
 * A dispatcher that sends the requests through `agent` as requests for
 * `host`, the API server behind the proxy.
 */
export const dispatcherFor = (agent: Dispatcher, host: string) => agent.compose(forwardTo(host));

interface ApiTargetOptions {
  /**
   * The URL of freelens-k8s-proxy, with its API prefix as the path.
   */
  target: URL;
  dispatcher: Dispatcher;
  timeout?: number;
}

/**
 * The options for http-proxy-3 to forward a request to freelens-k8s-proxy.
 *
 * They take the fetch path of http-proxy-3 rather than its native one, which
 * speaks only HTTP/1.1, with one socket per open request. The fetch path uses
 * neither `agent`, `ca` nor `secure`: the dispatcher holds the pool and the
 * certificate. It has to be undici's own `fetch`, as the copy of undici
 * embedded in Node rejects the dispatchers of the `undici` package.
 *
 * `changeOrigin` and a `Host` in `headers` are left out: `fetch` would drop
 * the `host` they set, and `new Headers()` in http-proxy-3 would join their
 * two values first.
 */
export const apiTargetOptions = ({ target, dispatcher, timeout }: ApiTargetOptions): ServerOptions => ({
  // http-proxy-3 prepends the `pathname` of the target and ignores a `path`
  // field, so the API prefix has to travel in a URL
  target,
  timeout,
  fetch: undiciFetch as unknown as typeof fetch,
  fetchOptions: {
    requestOptions: {
      dispatcher,
      // A redirect of the API server goes to the client, as it is: freelens-proxy
      // keeps it on the route of the cluster
      redirect: "manual",
    } as RequestInit,
  },
});
