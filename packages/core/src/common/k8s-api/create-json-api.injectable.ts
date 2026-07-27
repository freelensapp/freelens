/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApi } from "@freelensapp/json-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";
import { getLensProxyAgent } from "../fetch/lens-proxy-agent";
import nodeFetchInjectable, { type FetchRequestInit } from "../fetch/node-fetch.injectable";

import type { JsonApiConfig, JsonApiData, JsonApiDependencies, JsonApiParams } from "@freelensapp/json-api";

export type CreateJsonApi = <Data = JsonApiData, Params extends JsonApiParams<Data> = JsonApiParams<Data>>(
  config: JsonApiConfig,
  reqInit?: FetchRequestInit,
) => JsonApi<Data, Params>;

const createJsonApiInjectable = getInjectable({
  id: "create-json-api",
  instantiate: (di): CreateJsonApi => {
    const deps: JsonApiDependencies = {
      fetch: di.inject(nodeFetchInjectable),
      logger: di.inject(loggerInjectionToken),
    };
    const lensProxyCert = di.inject(lensProxyCertificateInjectable);

    return (config, reqInit) => {
      if (!config.getRequestOptions) {
        config.getRequestOptions = async () => ({
          dispatcher: getLensProxyAgent(lensProxyCert.get().cert),
        });
      }

      return new JsonApi(deps, config, reqInit);
    };
  },
});

export default createJsonApiInjectable;
