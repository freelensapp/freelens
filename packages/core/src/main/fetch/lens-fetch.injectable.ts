/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import fetchInjectable from "../../common/fetch/fetch.injectable";
import { freelensProxyDispatcherInjectionToken } from "../../common/fetch/freelens-proxy-dispatcher-injection-token";
import freelensProxyPortInjectable from "../../main/freelens-proxy/freelens-proxy-port.injectable";

import type { FetchRequestInit, FetchResponse } from "@freelensapp/json-api";

import type { MainFetch } from "./main-fetch-request-init";

/**
 * The dispatcher is lens-fetch's to choose, so the caller's init is the plain
 * public one and carries no slot for it.
 */
export type LensRequestInit = FetchRequestInit;

export type LensFetch = (pathnameAndQuery: string, init?: LensRequestInit) => Promise<FetchResponse>;

const lensFetchInjectable = getInjectable({
  id: "lens-fetch",
  instantiate: (di): LensFetch => {
    const fetch: MainFetch = di.inject(fetchInjectable);
    const freelensProxyPort = di.inject(freelensProxyPortInjectable);
    const freelensProxyDispatcher = di.inject(freelensProxyDispatcherInjectionToken);

    return async (pathnameAndQuery, init = {}) =>
      fetch(`https://127.0.0.1:${freelensProxyPort.get()}${pathnameAndQuery}`, {
        ...init,
        dispatcher: freelensProxyDispatcher(),
      });
  },
  causesSideEffects: true,
});

export default lensFetchInjectable;
