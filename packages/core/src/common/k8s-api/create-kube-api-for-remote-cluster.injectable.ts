/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeApi } from "@freelensapp/kube-api";
import {
  logDebugInjectionToken,
  logErrorInjectionToken,
  logInfoInjectionToken,
  logWarningInjectionToken,
} from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { Agent } from "undici";
import isDevelopmentInjectable from "../vars/is-development.injectable";
import createKubeJsonApiInjectable from "./create-kube-json-api.injectable";
import type { ConnectionOptions } from "node:tls";

import type { KubeApiOptions } from "@freelensapp/kube-api";
import type { KubeJsonApiDataFor, KubeObject, KubeObjectConstructor } from "@freelensapp/kube-object";

import type { Dispatcher, RequestInit } from "undici";

export interface CreateKubeApiForRemoteClusterConfig {
  cluster: {
    server: string;
    caData?: string;
    skipTLSVerify?: boolean;
  };
  user: {
    token?: string | (() => Promise<string>);
    clientCertificateData?: string;
    clientKeyData?: string;
  };
  /**
   * Custom undici dispatcher to use for the requests
   *
   * @remarks the custom dispatcher replaces the default one, so the options
   * skipTLSVerify, clientCertificateData, clientKeyData and caData are ignored.
   */
  dispatcher?: Dispatcher;
}

export type KubeApiConstructor<Object extends KubeObject, Api extends KubeApi<Object>> = new (
  apiOpts: KubeApiOptions<Object>,
) => Api;

export interface CreateKubeApiForRemoteCluster {
  <Object extends KubeObject, Api extends KubeApi<Object>, Data extends KubeJsonApiDataFor<Object>>(
    config: CreateKubeApiForRemoteClusterConfig,
    kubeClass: KubeObjectConstructor<Object, Data>,
    apiClass: KubeApiConstructor<Object, Api>,
  ): Api;
  <Object extends KubeObject, Data extends KubeJsonApiDataFor<Object>>(
    config: CreateKubeApiForRemoteClusterConfig,
    kubeClass: KubeObjectConstructor<Object, Data>,
    apiClass?: KubeApiConstructor<Object, KubeApi<Object>>,
  ): KubeApi<Object>;
}

const createKubeApiForRemoteClusterInjectable = getInjectable({
  id: "create-kube-api-for-remote-cluster",
  instantiate: (di): CreateKubeApiForRemoteCluster => {
    const isDevelopment = di.inject(isDevelopmentInjectable);
    const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);
    const logDebug = di.inject(logDebugInjectionToken);
    const logError = di.inject(logErrorInjectionToken);
    const logInfo = di.inject(logInfoInjectionToken);
    const logWarn = di.inject(logWarningInjectionToken);

    return (
      config: CreateKubeApiForRemoteClusterConfig,
      kubeClass: KubeObjectConstructor<KubeObject, KubeJsonApiDataFor<KubeObject>>,
      apiClass?: KubeApiConstructor<KubeObject, KubeApi<KubeObject>>,
    ) => {
      const reqInit: RequestInit = {};
      const connectOptions: ConnectionOptions = {};

      if (config.cluster.skipTLSVerify === true) {
        connectOptions.rejectUnauthorized = false;
      }

      if (config.user.clientCertificateData) {
        connectOptions.cert = config.user.clientCertificateData;
      }

      if (config.user.clientKeyData) {
        connectOptions.key = config.user.clientKeyData;
      }

      if (config.cluster.caData) {
        connectOptions.ca = config.cluster.caData;
      }

      if (Object.keys(connectOptions).length > 0) {
        reqInit.dispatcher = new Agent({ connect: connectOptions });
      }

      if (config.dispatcher) {
        reqInit.dispatcher = config.dispatcher;
      }

      const token = config.user.token;
      const request = createKubeJsonApi(
        {
          serverAddress: config.cluster.server,
          apiBase: "",
          debug: isDevelopment,
          ...(token
            ? {
                getRequestOptions: async () => ({
                  headers: {
                    Authorization: `Bearer ${typeof token === "function" ? await token() : token}`,
                  },
                }),
              }
            : {}),
        },
        reqInit,
      );

      if (apiClass) {
        return new apiClass({
          objectConstructor: kubeClass,
          request,
        });
      }

      return new KubeApi(
        {
          logDebug,
          logError,
          logInfo,
          logWarn,
          maybeKubeApi: undefined,
        },
        {
          objectConstructor: kubeClass,
          request,
        },
      );
    };
  },
});

export default createKubeApiForRemoteClusterInjectable;
