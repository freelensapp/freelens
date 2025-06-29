/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { HttpsProxyAgent } from "hpagent";
import https from "https";
import caCertificatesInjectable from "../../common/certificate/ca-certificates.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

export type HttpsAgent = () => https.Agent;

const httpsAgentInjectable: Injectable<HttpsAgent, unknown, void> = getInjectable({
  id: "https-agent",
  instantiate: (di) => {
    const ca = di.inject(caCertificatesInjectable);

    return () => {
      const userPreferencesState = di.inject(userPreferencesStateInjectable);

      const { httpsProxy, allowUntrustedCAs } = userPreferencesState;

      if (httpsProxy) {
        return new HttpsProxyAgent({
          proxy: httpsProxy,
          ca,
          rejectUnauthorized: !allowUntrustedCAs,
        });
      }

      return new https.Agent({
        ca,
        rejectUnauthorized: !allowUntrustedCAs,
      });
    };
  },
});

export default httpsAgentInjectable;
