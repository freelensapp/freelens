/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import http2 from "node:http2";

import type { ProxyServer } from "http-proxy-3";

import type { ServerResponse } from "./freelens-proxy";

/**
 * Whether the client has gone away, which over HTTP/2 closes only its stream.
 */
export const isClientGone = (res: ServerResponse) =>
  res instanceof http2.Http2ServerResponse ? res.stream.destroyed : res.destroyed;

/**
 * Aborts the request to the target once the client has gone away before its
 * response was ended, on the native path of http-proxy-3, which the
 * development route takes.
 *
 * http-proxy-3 does that itself only while `res.writableFinished` is false.
 * For an HTTP/2 response that is the stream's, which a stream the client
 * cancels reports as finished, so the request to the target would stay open
 * and keep sending into a closed stream: a watch for good, and any request for
 * as long as it holds one of the sockets of an agent.
 */
export function abortWhenClientCloses(proxy: ProxyServer) {
  proxy.on("proxyReq", (proxyReq, _req, res) => {
    // The two kinds of response, but the types of http-proxy-3 name only one
    const response = res as ServerResponse;
    const abort = () => {
      if (!response.writableEnded) {
        proxyReq.destroy();
      }
    };

    // An agent hands out a socket, and with it this event, only when one is
    // free, by which time the client may have gone already
    if (isClientGone(response)) {
      abort();
    } else {
      response.once("close", abort);
    }
  });
}

/**
 * The same for the fetch path of http-proxy-3, which emits no `proxyReq`, and
 * passes no signal to `fetch` but that of `proxyTimeout`: gives the request a
 * signal that aborts it once the client has gone away before its response was
 * ended. Over HTTP/2 the abort reaches the target as a reset of the stream.
 *
 * The fetch then fails with an `AbortError`, which reaches the `error` handler
 * of the proxy with a response whose client is gone.
 */
export function abortFetchWhenClientCloses(requestOptions: RequestInit, res: ServerResponse) {
  const controller = new AbortController();
  const abort = () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  };

  requestOptions.signal = requestOptions.signal
    ? AbortSignal.any([requestOptions.signal, controller.signal])
    : controller.signal;

  // The proxy is started before the request is forwarded, by which time the
  // client may have gone already
  if (isClientGone(res)) {
    abort();
  } else {
    res.once("close", abort);
  }
}
