/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Agent } from "node:https";
import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import createFreelensK8sProxyInjectable from "../freelens-k8s-proxy/create-freelens-k8s-proxy.injectable";
import freelensK8sProxyCertificateInjectable from "../freelens-k8s-proxy/freelens-k8s-proxy-certificate.injectable";
import freelensK8sProxyServersInjectable from "./freelens-k8s-proxy-servers.injectable";

import type { ServerOptions } from "http-proxy-3";

import type { Cluster } from "../../common/cluster/cluster";
import type { FreelensK8sProxy } from "../freelens-k8s-proxy/create-freelens-k8s-proxy.injectable";

export interface FreelensK8sProxyServer {
  getApiTarget(isLongRunningRequest?: boolean): Promise<ServerOptions>;
  ensureFreelensK8sProxyUrl(): Promise<string>;
  restart(): Promise<void>;
  ensureRunning(): Promise<void>;
  stop(): void;

  /**
   * The URL of the API server that the last target forwards to, as the
   * kubeconfig gives it: `undefined` until a target has been made.
   */
  readonly apiUrl?: URL;
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
    let apiUrl: URL | undefined = undefined;
    let agent: Agent | undefined;

    const getAgent = () =>
      (agent ??= new Agent({
        keepAlive: true,
        // Watches hold sockets for hours. An unbounded pool keeps ordinary
        // requests from queuing behind them.
        maxSockets: Infinity,
        maxFreeSockets: 16,
      }));

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
      // The proxy is created and its start begun before anything is awaited,
      // so a stop() while the API URL is read reaches its exit(), which aborts
      // the start. Awaited first, they would let the start spawn a process
      // after the stop.
      const [{ port, apiPrefix: path }, url] = await Promise.all([ensureServerHelper(), clusterApiUrl()]);
      const { hostname } = url;
      const certificate = await di.inject(freelensK8sProxyCertificateInjectable, hostname);

      apiUrl = url;

      return {
        agent: getAgent(),
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
      // Never reuse sockets to a stopped proxy process after a restart.
      agent?.destroy();
      agent = undefined;
      freelensK8sProxy?.exit();
      freelensK8sProxy = undefined;
      apiTarget = undefined;
    };

    const freelensK8sProxyServer: FreelensK8sProxyServer = {
      get apiUrl() {
        return apiUrl;
      },
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

    di.inject(freelensK8sProxyServersInjectable).add(freelensK8sProxyServer);

    return freelensK8sProxyServer;
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default freelensK8sProxyServerInjectable;
