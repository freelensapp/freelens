/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeJsonApi } from "@freelensapp/kube-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "https";
import nodeFetchInjectable, { type NodeFetchRequestInit } from "../../main/fetch/node-fetch.injectable";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";

import type { JsonApiConfig, JsonApiDependencies } from "@freelensapp/json-api";

export type CreateKubeJsonApi = (config: JsonApiConfig, reqInit?: NodeFetchRequestInit) => KubeJsonApi;

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
        config.getRequestOptions = async () => {
          const agent = new Agent({
            ca: lensProxyCert.get().cert,
          });

          return {
            agent,
          };
        };
      }

      return new KubeJsonApi(dependencies, config, reqInit);
    };
  },
});

export default createKubeJsonApiInjectable;
