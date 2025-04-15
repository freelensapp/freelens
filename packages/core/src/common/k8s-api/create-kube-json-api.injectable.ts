/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Agent } from "https";
import type { JsonApiConfig, JsonApiDependencies } from "@freelensapp/json-api";
import { KubeJsonApi } from "@freelensapp/kube-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import type { RequestInit } from "@freelensapp/node-fetch";
import { getInjectable } from "@ogre-tools/injectable";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";
import fetchInjectable from "../fetch/fetch.injectable";

export type CreateKubeJsonApi = (config: JsonApiConfig, reqInit?: RequestInit) => KubeJsonApi;

const createKubeJsonApiInjectable = getInjectable({
  id: "create-kube-json-api",
  instantiate: (di): CreateKubeJsonApi => {
    const dependencies: JsonApiDependencies = {
      fetch: di.inject(fetchInjectable),
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
