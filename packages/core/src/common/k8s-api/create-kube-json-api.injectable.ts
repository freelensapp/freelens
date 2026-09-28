/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeJsonApi } from "@freelensapp/kube-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import packageJson from "../../../package.json";
import fetchInjectable from "../fetch/fetch.injectable";
import { lensProxyDispatcherInjectionToken } from "../fetch/lens-proxy-dispatcher-injection-token";

import type { FetchRequestInit, JsonApiConfig, JsonApiDependencies } from "@freelensapp/json-api";

import type { MainFetchRequestInit } from "../../main/fetch/main-fetch-request-init";

export type CreateKubeJsonApi = (config: JsonApiConfig, reqInit?: FetchRequestInit) => KubeJsonApi;

const createKubeJsonApiInjectable = getInjectable({
  id: "create-kube-json-api",
  instantiate: (di): CreateKubeJsonApi => {
    const dependencies: JsonApiDependencies = {
      fetch: di.inject(fetchInjectable),
      logger: di.inject(loggerInjectionToken),
    };
    const lensProxyDispatcher = di.inject(lensProxyDispatcherInjectionToken);

    return (config, reqInit) => {
      if (!config.getRequestOptions) {
        config.getRequestOptions = async (): Promise<MainFetchRequestInit> => {
          const dispatcher = lensProxyDispatcher();

          // `User-Agent` is a forbidden header name in the renderer, where
          // Chromium sets its own; only main gets to send this one.
          return dispatcher
            ? {
                dispatcher,
                headers: {
                  "User-Agent": `Freelens/${packageJson.version}`,
                },
              }
            : {};
        };
      }

      return new KubeJsonApi(dependencies, config, reqInit);
    };
  },
});

export default createKubeJsonApiInjectable;
