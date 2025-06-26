/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "https";
import lensProxyPortInjectable from "../../main/lens-proxy/lens-proxy-port.injectable";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";
import nodeFetchInjectable, { type NodeFetchRequestInit, type NodeFetchResponse } from "./node-fetch.injectable";

export type LensRequestInit = Omit<NodeFetchRequestInit, "agent">;

export type LensFetch = (pathnameAndQuery: string, init?: LensRequestInit) => Promise<NodeFetchResponse>;

const lensFetchInjectable = getInjectable({
  id: "lens-fetch",
  instantiate: (di): LensFetch => {
    const nodeFetch = di.inject(nodeFetchInjectable);
    const lensProxyPort = di.inject(lensProxyPortInjectable);
    const lensProxyCertificate = di.inject(lensProxyCertificateInjectable);

    return async (pathnameAndQuery, init = {}) => {
      const agent = new Agent({
        ca: lensProxyCertificate.get().cert,
      });

      return nodeFetch(`https://127.0.0.1:${lensProxyPort.get()}${pathnameAndQuery}`, {
        ...init,
        agent,
      });
    };
  },
  causesSideEffects: true,
});

export default lensFetchInjectable;
