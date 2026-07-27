/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeJsonApi } from "@freelensapp/kube-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import packageJson from "../../../package.json";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";
import { getLensProxyAgent } from "../fetch/lens-proxy-agent";
import nodeFetchInjectable, { type FetchRequestInit } from "../fetch/node-fetch.injectable";

import type { JsonApiConfig, JsonApiDependencies } from "@freelensapp/json-api";

export type CreateKubeJsonApi = (config: JsonApiConfig, reqInit?: FetchRequestInit) => KubeJsonApi;

const createKubeJsonApiInjectable = getInjectable({
  id: "create-kube-json-api",
  instantiate: (di): CreateKubeJsonApi => {
    const dependencies: JsonApiDependencies = {
      fetch: di.inject(nodeFetchInjectable),
      logger: di.inject(loggerInjectionToken),
    };
    const lensProxyCert = di.inject(lensProxyCertificateInjectable);

    return (config, reqInit) => {
      if (!config.getRequestOptions) {
        config.getRequestOptions = async () => ({
          dispatcher: getLensProxyAgent(lensProxyCert.get().cert),
          headers: {
            "User-Agent": `Freelens/${packageJson.version}`,
          },
        });
      }

      return new KubeJsonApi(dependencies, config, reqInit);
    };
  },
});

export default createKubeJsonApiInjectable;
