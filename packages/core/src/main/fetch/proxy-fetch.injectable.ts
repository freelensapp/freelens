/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import nodeFetch, { type RequestInfo, type RequestInit, type Response } from "@freelensapp/node-fetch";

export type NodeFetchRequestInfo = RequestInfo;
export type NodeFetchRequestInit = RequestInit;
export type NodeFetchResponse = Response;

export type NodeFetch = (url: URL | NodeFetchRequestInfo, init?: NodeFetchRequestInit) => Promise<NodeFetchResponse>;

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { HttpsProxyAgent } from "hpagent";
import https from "https";
import isWindowsInjectable from "../../common/vars/is-windows.injectable";
import win32RequestSystemCAsInjectable from "../../features/certificate-authorities/main/win32-request-system-cas.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";

export type ProxyFetch = NodeFetch;

const proxyFetchInjectable: Injectable<NodeFetch, unknown, void> = getInjectable({
  id: "proxy-fetch",
  instantiate: (di): ProxyFetch => {
    const logger = di.inject(loggerInjectionToken);
    const userPreferencesState = di.inject(userPreferencesStateInjectable);
    const isWindows = di.inject(isWindowsInjectable);
    const win32RequestSystemCAs = di.inject(win32RequestSystemCAsInjectable);

    return async (url, init = {}) => {
      const { httpsProxy, allowUntrustedCAs } = userPreferencesState;
      let agent: HttpsProxyAgent | undefined;
      const ca = isWindows ? await win32RequestSystemCAs.instantiate()() : undefined;
      if (httpsProxy) {
        try {
          agent = new HttpsProxyAgent({
            proxy: httpsProxy,
            ca,
            rejectUnauthorized: !allowUntrustedCAs,
          });
          logger.debug(`[PROXY-FETCH]: Uses proxy agent (${httpsProxy})`);
        } catch (error) {
          logger.error(`[PROXY-FETCH]: Proxy agent error (${httpsProxy}): ${error}`);
        }
      }
      if (!agent) {
        agent = new https.Agent({
          ca,
        });
      }
      logger.debug(`[PROXY-FETCH]: Uses agent with ${ca ? ca.length : "no"} custom CAs`);

      return await nodeFetch(url, {
        agent,
        ...init,
      });
    };
  },
});

export default proxyFetchInjectable;
