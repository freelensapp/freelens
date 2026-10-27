/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { Agent, ProxyAgent } from "undici";
import caCertificatesInjectable from "../../common/certificate/ca-certificates.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { refuseBrotli } from "./refuse-brotli";

import type { Dispatcher } from "undici";

export type HttpsAgent = () => Dispatcher;

interface TlsOptions {
  ca: string[];
  rejectUnauthorized: boolean;
}

// The certificate authorities, and whether untrusted ones are allowed, are for the server behind the proxy, which
// undici reaches with `requestTls`, and for an https:// proxy itself, which it reaches with `proxyTls`. Undici speaks
// TLS to a SOCKS proxy that is given `proxyTls`, so a SOCKS proxy and an http:// one are given none.
function createProxyAgent(uri: string, tls: TlsOptions): ProxyAgent {
  return new ProxyAgent({ uri, requestTls: tls, ...(/^https:\/\//i.test(uri) ? { proxyTls: tls } : {}) });
}

const httpsAgentInjectable: Injectable<HttpsAgent, unknown, void> = getInjectable({
  id: "https-agent",
  instantiate: (di) => {
    const ca = di.inject(caCertificatesInjectable);

    // undici keeps a connection pool per dispatcher, so the dispatcher is built
    // once and only rebuilt when the preferences it derives from change. The
    // superseded one is closed so its idle sockets do not linger.
    let current: { key: string; dispatcher: Dispatcher } | undefined;

    return () => {
      const userPreferencesState = di.inject(userPreferencesStateInjectable);

      const { httpsProxy, allowUntrustedCAs } = userPreferencesState;
      const key = `${allowUntrustedCAs ? "1" : "0"}:${httpsProxy ?? ""}`;

      if (current?.key !== key) {
        void current?.dispatcher.close();

        const connect = { ca, rejectUnauthorized: !allowUntrustedCAs };

        current = {
          key,
          dispatcher: (httpsProxy ? createProxyAgent(httpsProxy, connect) : new Agent({ connect })).compose(
            refuseBrotli,
          ),
        };
      }

      return current.dispatcher;
    };
  },
});

export default httpsAgentInjectable;
