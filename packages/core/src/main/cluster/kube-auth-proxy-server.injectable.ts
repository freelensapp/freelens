/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import clusterApiUrlInjectable from "../../features/cluster/connections/main/api-url.injectable";
import createKubeAuthProxyInjectable from "../kube-auth-proxy/create-kube-auth-proxy.injectable";
import kubeAuthProxyCertificateInjectable from "../kube-auth-proxy/kube-auth-proxy-certificate.injectable";
import powerMonitorInjectable from "../electron-app/features/power-monitor.injectable";

import type { ServerOptions } from "http-proxy-node16";

import type { Cluster } from "../../common/cluster/cluster";
import type { KubeAuthProxy } from "../kube-auth-proxy/create-kube-auth-proxy.injectable";

export interface KubeAuthProxyServer {
  getApiTarget(isLongRunningRequest?: boolean): Promise<ServerOptions>;
  ensureAuthProxyUrl(): Promise<string>;
  restart(): Promise<void>;
  ensureRunning(): Promise<void>;
  stop(): void;
}

const fourHoursInMs = 4 * 60 * 60 * 1000;
const thirtySecondsInMs = 30 * 1000;

let isSystemSuspendedGlobal = false;
let listenersAttached = false;

const kubeAuthProxyServerInjectable = getInjectable({
  id: "kube-auth-proxy-server",
  instantiate: (di, cluster): KubeAuthProxyServer => {
    const clusterApiUrl = di.inject(clusterApiUrlInjectable, cluster);
    const createKubeAuthProxy = di.inject(createKubeAuthProxyInjectable, cluster);
    const powerMonitor = di.inject(powerMonitorInjectable);

    if (!listenersAttached) {
      const onSuspend = () => {
        isSystemSuspendedGlobal = true;
      };
      const onResume = () => {
        isSystemSuspendedGlobal = false;
      };

      powerMonitor.on("suspend", onSuspend);
      powerMonitor.on("lock-screen", onSuspend);
      powerMonitor.on("resume", onResume);
      powerMonitor.on("unlock-screen", onResume);
      listenersAttached = true;
    }

    let kubeAuthProxy: KubeAuthProxy | undefined = undefined;
    let apiTarget: ServerOptions | undefined = undefined;

    const ensureServerHelper = async (): Promise<KubeAuthProxy> => {
      if (isSystemSuspendedGlobal) {
        throw new Error("System is suspended/locked");
      }

      if (!kubeAuthProxy) {
        const proxyEnv = {
          ...process.env,
        };

        if (cluster.preferences.httpsProxy) {
          proxyEnv.HTTPS_PROXY = cluster.preferences.httpsProxy;
        }

        kubeAuthProxy = createKubeAuthProxy(proxyEnv);
      }

      await kubeAuthProxy.run();

      return kubeAuthProxy;
    };

    const newApiTarget = async (timeout: number): Promise<ServerOptions> => {
      const { hostname } = await clusterApiUrl();
      const certificate = di.inject(kubeAuthProxyCertificateInjectable, hostname);
      const { port, apiPrefix: path } = await ensureServerHelper();

      return {
        target: {
          protocol: "https:",
          host: "127.0.0.1",
          port,
          path,
          ca: certificate.cert,
        },
        changeOrigin: true,
        timeout,
        secure: true,
        headers: {
          Host: hostname,
        },
      };
    };

    const stopServer = () => {
      kubeAuthProxy?.exit();
      kubeAuthProxy = undefined;
      apiTarget = undefined;
    };

    return {
      getApiTarget: async (isLongRunningRequest = false) => {
        if (isSystemSuspendedGlobal) {
          throw new Error("System is suspended/locked");
        }

        if (isLongRunningRequest) {
          return newApiTarget(fourHoursInMs);
        }

        return (apiTarget ??= await newApiTarget(thirtySecondsInMs));
      },
      ensureAuthProxyUrl: async () => {
        const kubeAuthProxy = await ensureServerHelper();

        return `https://127.0.0.1:${kubeAuthProxy.port}${kubeAuthProxy.apiPrefix}`;
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

export default kubeAuthProxyServerInjectable;
