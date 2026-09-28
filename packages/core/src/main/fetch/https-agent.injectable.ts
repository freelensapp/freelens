/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { Agent, ProxyAgent } from "undici";
import caCertificatesInjectable from "../../common/certificate/ca-certificates.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

import type { Dispatcher } from "undici";

export type HttpsAgent = () => Dispatcher;

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
          dispatcher: httpsProxy
            ? new ProxyAgent({ uri: httpsProxy, connect, proxyTls: connect })
            : new Agent({ connect }),
        };
      }

      return current.dispatcher;
    };
  },
});

export default httpsAgentInjectable;
