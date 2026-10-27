/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ProxyAgent } from "undici";
import type { ConnectionOptions } from "node:tls";

export type HttpsProxyTls = Pick<ConnectionOptions, "ca" | "rejectUnauthorized">;

/**
 * A dispatcher that sends every request through the proxy of the `httpsProxy`
 * preference: an HTTP or HTTPS proxy by `CONNECT`, a SOCKS5 proxy by the SOCKS
 * protocol.
 *
 * The TLS options go to `requestTls`, the connection with the server the
 * request is for, where `caCertificates` and `allowUntrustedCAs` belong.
 * `ProxyAgent` does not read `connect` at all. They also go to `proxyTls` for
 * an `https:` proxy, and only for one: for a SOCKS5 proxy, undici takes the
 * presence of `proxyTls` as a request to speak TLS to the proxy, so the proxy
 * gets a TLS handshake instead of a SOCKS greeting and drops the connection.
 *
 * undici's SOCKS5 client sends the host name to the proxy, so `socks5h:`, which
 * other tools use for exactly that, means the same as `socks5:` here.
 */
export const createHttpsProxyAgent = (proxy: string, tls: HttpsProxyTls): ProxyAgent => {
  const uri = proxy.replace(/^socks5h:/i, "socks5:");
  const { protocol } = new URL(uri);

  switch (protocol) {
    case "http:":
    case "socks:":
    case "socks5:":
      return new ProxyAgent({ uri, requestTls: tls });
    case "https:":
      return new ProxyAgent({ uri, requestTls: tls, proxyTls: tls });
    default:
      throw new TypeError(
        `Unsupported proxy URL scheme "${protocol}" in the HTTP Proxy preference: use http:, https: or socks5:`,
      );
  }
};
