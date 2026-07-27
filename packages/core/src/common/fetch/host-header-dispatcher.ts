/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getGlobalDispatcher } from "undici";

import type { Dispatcher, HeadersInit, RequestInit, Headers as UndiciHeaders } from "undici";

/**
 * lens-proxy routes to a cluster on the `Host` header while the socket is
 * opened to `https://127.0.0.1:<lensProxyPort>`, so that header is load-bearing
 * for every cluster view.
 *
 * `fetch` cannot carry it: `host` is a forbidden header name, and undici's
 * `Request` constructor applies the same "request" header guard a browser does,
 * dropping it before it ever reaches the wire. undici's *core* dispatch layer
 * has no such guard, so the value is smuggled past `fetch` by taking it out of
 * the request headers and re-adding it from a dispatcher interceptor.
 */

const isHostHeader = (name: string) => name.toLowerCase() === "host";

interface HostAndHeaders {
  host?: string;
  headers?: HeadersInit;
}

const isHeadersInstance = (headers: HeadersInit): headers is UndiciHeaders =>
  typeof (headers as UndiciHeaders).get === "function" && typeof (headers as UndiciHeaders).forEach === "function";

const takeHostHeader = (headers: HeadersInit | undefined): HostAndHeaders => {
  if (!headers) {
    return {};
  }

  if (Array.isArray(headers)) {
    const host = headers.filter(([name]) => isHostHeader(name)).at(-1)?.[1];

    return host === undefined ? { headers } : { host, headers: headers.filter(([name]) => !isHostHeader(name)) };
  }

  if (isHeadersInstance(headers)) {
    const host = headers.get("host");

    if (host === null) {
      return { headers };
    }

    const rest: [string, string][] = [];

    headers.forEach((value, name) => {
      if (!isHostHeader(name)) {
        rest.push([name, value]);
      }
    });

    return { host, headers: rest };
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const hostName = Object.keys(record).find(isHostHeader);

  if (hostName === undefined) {
    return { headers };
  }

  const { [hostName]: host, ...rest } = record;

  return {
    host: Array.isArray(host) ? host[0] : host,
    headers: rest as HeadersInit,
  };
};

const setHostInterceptor =
  (host: string): Dispatcher.DispatcherComposeInterceptor =>
  (dispatch) =>
  (options, handler) =>
    dispatch(
      {
        ...options,
        headers: Array.isArray(options.headers)
          ? [...options.headers, "host", host]
          : { ...(options.headers as Record<string, unknown>), host },
      },
      handler,
    );

/**
 * `compose()` allocates a dispatcher and `JsonApi` sends the same `Host` on
 * every request, so composed dispatchers are cached per (dispatcher, host) pair
 * rather than rebuilt per request.
 */
const composedDispatchers = new WeakMap<Dispatcher, Map<string, Dispatcher>>();

const composeWithHost = (dispatcher: Dispatcher, host: string): Dispatcher => {
  let byHost = composedDispatchers.get(dispatcher);

  if (!byHost) {
    byHost = new Map();
    composedDispatchers.set(dispatcher, byHost);
  }

  const cached = byHost.get(host);

  if (cached) {
    return cached;
  }

  const composed = dispatcher.compose(setHostInterceptor(host));

  byHost.set(host, composed);

  return composed;
};

/**
 * Rewrites a `RequestInit` so that a `Host` header in it survives `fetch`.
 *
 * Returns `init` untouched when it carries no `Host` header, which is every
 * request that does not go through lens-proxy.
 */
export const withHostHeaderPreserved = <T extends RequestInit>(init: T | undefined): T | undefined => {
  if (!init) {
    return init;
  }

  const { host, headers } = takeHostHeader(init.headers);

  if (host === undefined) {
    return init;
  }

  return {
    ...init,
    headers,
    dispatcher: composeWithHost(init.dispatcher ?? getGlobalDispatcher(), host),
  };
};
