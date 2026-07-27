/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { JsonApi } from "@freelensapp/json-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import fetchInjectable from "../fetch/fetch.injectable";
import { lensProxyDispatcherInjectionToken } from "../fetch/lens-proxy-dispatcher-injection-token";

import type {
  FetchRequestInit,
  JsonApiConfig,
  JsonApiData,
  JsonApiDependencies,
  JsonApiParams,
} from "@freelensapp/json-api";

export type CreateJsonApi = <Data = JsonApiData, Params extends JsonApiParams<Data> = JsonApiParams<Data>>(
  config: JsonApiConfig,
  reqInit?: FetchRequestInit,
) => JsonApi<Data, Params>;

const createJsonApiInjectable = getInjectable({
  id: "create-json-api",
  instantiate: (di): CreateJsonApi => {
    const deps: JsonApiDependencies = {
      fetch: di.inject(fetchInjectable),
      logger: di.inject(loggerInjectionToken),
    };
    const lensProxyDispatcher = di.inject(lensProxyDispatcherInjectionToken);

    return (config, reqInit) => {
      if (!config.getRequestOptions) {
        config.getRequestOptions = async () => {
          const dispatcher = lensProxyDispatcher();

          return dispatcher ? { dispatcher } : {};
        };
      }

      return new JsonApi(deps, config, reqInit);
    };
  },
});

export default createJsonApiInjectable;
