/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApi } from "@freelensapp/json-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "https";
import lensProxyCertificateInjectable from "../certificate/lens-proxy-certificate.injectable";
import fetchInjectable from "../fetch/fetch.injectable";

import type { JsonApiConfig, JsonApiData, JsonApiDependencies, JsonApiParams } from "@freelensapp/json-api";
import type { RequestInit } from "@freelensapp/node-fetch";

export type CreateJsonApi = <Data = JsonApiData, Params extends JsonApiParams<Data> = JsonApiParams<Data>>(
  config: JsonApiConfig,
  reqInit?: RequestInit,
) => JsonApi<Data, Params>;

const createJsonApiInjectable = getInjectable({
  id: "create-json-api",
  instantiate: (di): CreateJsonApi => {
    const deps: JsonApiDependencies = {
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

      return new JsonApi(deps, config, reqInit);
    };
  },
});

export default createJsonApiInjectable;
