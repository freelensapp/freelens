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
import freelensK8sProxyManagersInjectable from "./freelens-k8s-proxy-managers.injectable";

import type { ServerOptions } from "http-proxy-3";

import type { Cluster } from "../../common/cluster/cluster";
import type { FreelensK8sProxy } from "../freelens-k8s-proxy/create-freelens-k8s-proxy.injectable";

export interface FreelensK8sProxyManager {
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

interface ApiTarget {
  /**
   * The port of the proxy process that the target forwards to.
   */
  port: number;
  options: ServerOptions;
}

const fourHoursInMs = 4 * 60 * 60 * 1000;
const thirtySecondsInMs = 30 * 1000;

const freelensK8sProxyManagerInjectable = getInjectable({
  id: "freelens-k8s-proxy-manager",
  instantiate: (di, cluster): FreelensK8sProxyManager => {
    const clusterApiUrl = di.inject(clusterApiUrlInjectable, cluster);
    const createFreelensK8sProxy = di.inject(createFreelensK8sProxyInjectable, cluster);

    let freelensK8sProxy: FreelensK8sProxy | undefined = undefined;
    let apiTarget: ApiTarget | undefined = undefined;
    let apiUrl: URL | undefined = undefined;
    let agent: Agent | undefined;

    const getAgent = () =>
      (agent ??= new Agent({
        keepAlive: true,
        // Watches hold sockets for hours. An unbounded pool keeps ordinary
        // requests from queuing behind them.
        maxSockets: Infinity,
        maxFreeSockets: 16,
        // Free sockets get no idle timeout. That is safe only because the
        // HTTP server of freelens-k8s-proxy closes no idle connection. Were it
        // given an idle timeout, a request could go out on a socket the server
        // has just closed, and a non-idempotent one would fail with a reset:
        // this agent would then need a `timeout` shorter than the server's.
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

    const newApiTarget = async (timeout: number): Promise<ApiTarget> => {
      // The proxy is created and its start begun before anything is awaited,
      // so a stop() while the API URL is read reaches its exit(), which aborts
      // the start. Awaited first, they would let the start spawn a process
      // after the stop.
      const [{ port, apiPrefix: path }, url] = await Promise.all([ensureServerHelper(), clusterApiUrl()]);
      const { hostname } = url;
      const certificate = await di.inject(freelensK8sProxyCertificateInjectable, hostname);

      apiUrl = url;

      return {
        port,
        options: {
          agent: getAgent(),
          // http-proxy-3 prepends the `pathname` of the target and ignores a
          // `path` field, so the API prefix has to travel in a URL, and the
          // CA, which a URL cannot carry, in the options.
          target: new URL(`https://127.0.0.1:${port}${path}`),
          ca: certificate.cert,
          changeOrigin: true,
          timeout,
          secure: true,
          headers: {
            Host: hostname,
          },
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

    const freelensK8sProxyManager: FreelensK8sProxyManager = {
      get apiUrl() {
        return apiUrl;
      },
      getApiTarget: async (isLongRunningRequest = false) => {
        if (isLongRunningRequest) {
          return (await newApiTarget(fourHoursInMs)).options;
        }

        // The cached target points at the port of one proxy process. Once that
        // process has exited, on its own or not, a new target starts a new one,
        // or points at the one that ensureRunning() or
        // ensureFreelensK8sProxyUrl() has started in its place.
        if (!apiTarget || !freelensK8sProxy?.isRunning || apiTarget.port !== freelensK8sProxy.port) {
          apiTarget = await newApiTarget(thirtySecondsInMs);
        }

        return apiTarget.options;
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

    di.inject(freelensK8sProxyManagersInjectable).add(freelensK8sProxyManager);

    return freelensK8sProxyManager;
  },
  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, cluster: Cluster) => cluster.id,
  }),
});

export default freelensK8sProxyManagerInjectable;
