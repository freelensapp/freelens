/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import fetchInjectable from "../../common/fetch/fetch.injectable";
import { lensProxyDispatcherInjectionToken } from "../../common/fetch/lens-proxy-dispatcher-injection-token";
import lensProxyPortInjectable from "../../main/lens-proxy/lens-proxy-port.injectable";

import type { FetchRequestInit, FetchResponse } from "@freelensapp/json-api";

export type LensRequestInit = Omit<FetchRequestInit, "dispatcher">;

export type LensFetch = (pathnameAndQuery: string, init?: LensRequestInit) => Promise<FetchResponse>;

const lensFetchInjectable = getInjectable({
  id: "lens-fetch",
  instantiate: (di): LensFetch => {
    const fetch = di.inject(fetchInjectable);
    const lensProxyPort = di.inject(lensProxyPortInjectable);
    const lensProxyDispatcher = di.inject(lensProxyDispatcherInjectionToken);

    return async (pathnameAndQuery, init = {}) =>
      fetch(`https://127.0.0.1:${lensProxyPort.get()}${pathnameAndQuery}`, {
        ...init,
        dispatcher: lensProxyDispatcher(),
      });
  },
  causesSideEffects: true,
});

export default lensFetchInjectable;
