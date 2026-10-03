/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import createFreelensK8sProxyInjectable from "../freelens-k8s-proxy/create-freelens-k8s-proxy.injectable";
import freelensK8sProxyCertificateInjectable from "../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";

import type { ServerOptions } from "http-proxy-3";

import type { Cluster } from "../../common/cluster/cluster";
import type { FreelensK8sProxy } from "../freelens-k8s-proxy/create-freelens-k8s-proxy.injectable";

export interface FreelensK8sProxyServer {
  getApiTarget(isLongRunningRequest?: boolean): Promise<ServerOptions>;
  ensureFreelensK8sProxyUrl(): Promise<string>;
  restart(): Promise<void>;
  ensureRunning(): Promise<void>;
  stop(): void;
}

const fourHoursInMs = 4 * 60 * 60 * 1000;
const thirtySecondsInMs = 30 * 1000;

const freelensK8sProxyServerInjectable = getInjectable({
  id: "freelens-k8s-proxy-server",
  instantiate: (di, cluster): FreelensK8sProxyServer => {
    const clusterApiUrl = di.inject(clusterApiUrlInjectable, cluster);
    const createFreelensK8sProxy = di.inject(createFreelensK8sProxyInjectable, cluster);

    let freelensK8sProxy: FreelensK8sProxy | undefined = undefined;
    let apiTarget: ServerOptions | undefined = undefined;

    const ensureServerHelper = async (): Promise<FreelensK8sProxy> => {
      if (!freelensK8sProxy) {
        const proxyEnv = {
          ...process.env,
        };

        if (cluster.preferences.httpsProxy) {
          proxyEnv.HTTPS_PROXY = cluster.preferences.httpsProxy;
        }

        freelensK8sProxy = createFreelensK8sProxy(proxyEnv);
      }

      await freelensK8sProxy.run();

      return freelensK8sProxy;
    };

    const newApiTarget = async (timeout: number): Promise<ServerOptions> => {
      const { hostname } = await clusterApiUrl();
      const certificate = await di.inject(freelensK8sProxyCertificateInjectable, hostname);
      const { port, apiPrefix: path } = await ensureServerHelper();

      return {
        // http-proxy-3 prepends the `pathname` of the target and ignores a
        // `path` field, so the API prefix has to travel in a URL, and the CA,
        // which a URL cannot carry, in the options.
        target: new URL(`https://127.0.0.1:${port}${path}`),
        ca: certificate.cert,
        changeOrigin: true,
        timeout,
        secure: true,
        headers: {
          Host: hostname,
        },
      };
    };

    const stopServer = () => {
      freelensK8sProxy?.exit();
      freelensK8sProxy = undefined;
      apiTarget = undefined;
    };

    return {
      getApiTarget: async (isLongRunningRequest = false) => {
        if (isLongRunningRequest) {
          return newApiTarget(fourHoursInMs);
        }

        // The cached target points at the port of one proxy process. Once that
        // process has exited, on its own or not, a new target starts a new one.
        if (!apiTarget || !freelensK8sProxy?.isRunning) {
          apiTarget = await newApiTarget(thirtySecondsInMs);
        }

        return apiTarget;
      },
      ensureFreelensK8sProxyUrl: async () => {
        const freelensK8sProxy = await ensureServerHelper();

        return `https://127.0.0.1:${freelensK8sProxy.port}${freelensK8sProxy.apiPrefix}`;
      },
      ensureRunning: async () => {
        await ensureServerHelper();
      },
      restart: async () => {
        stopServer();
        await ensureServerHelper();
      },
      stop: stopServer,
    };
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default freelensK8sProxyServerInjectable;
