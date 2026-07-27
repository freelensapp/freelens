/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import lensProxyCertificateInjectable from "../../common/certificate/lens-proxy-certificate.injectable";
import { getLensProxyAgent } from "../../common/fetch/lens-proxy-agent";
import nodeFetchInjectable, {
  type FetchRequestInit,
  type FetchResponse,
} from "../../common/fetch/node-fetch.injectable";
import lensProxyPortInjectable from "../../main/lens-proxy/lens-proxy-port.injectable";

export type LensRequestInit = Omit<FetchRequestInit, "dispatcher">;

export type LensFetch = (pathnameAndQuery: string, init?: LensRequestInit) => Promise<FetchResponse>;

const lensFetchInjectable = getInjectable({
  id: "lens-fetch",
  instantiate: (di): LensFetch => {
    const nodeFetch = di.inject(nodeFetchInjectable);
    const lensProxyPort = di.inject(lensProxyPortInjectable);
    const lensProxyCertificate = di.inject(lensProxyCertificateInjectable);

    return async (pathnameAndQuery, init = {}) =>
      nodeFetch(`https://127.0.0.1:${lensProxyPort.get()}${pathnameAndQuery}`, {
        ...init,
        dispatcher: getLensProxyAgent(lensProxyCertificate.get().cert),
      });
  },
  causesSideEffects: true,
});

export default lensFetchInjectable;
