/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import createKubeJsonApiForClusterInjectable from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import loadProxyKubeconfigInjectable from "../../cluster/load-proxy-kubeconfig.injectable";
import freelensProxyTokenInjectable from "../../freelens-proxy/freelens-proxy-token.injectable";
import computeUserShellEnvironmentInjectable from "../../kube-tools/compute-user-shell-environment.injectable";
import getUserShellInjectable from "../../kube-tools/get-user-shell.injectable";
import resolveKubeToolsInjectable from "../../kube-tools/resolve-kube-tools.injectable";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../processes.injectable";
import { kubectlStatusOptionsFor, terminalStatusReporterFor } from "../send-terminal-status";
import shellSessionEnvsInjectable from "../shell-envs.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import { closedDuring, websocketClosedSignal } from "../websocket-closed";
import { NodeShellSession } from "./node-shell-session";

import type WebSocket from "ws";

import type { Cluster } from "../../../common/cluster/cluster";
import type { NodeShellSessionDependencies } from "./node-shell-session";

export interface NodeShellSessionArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
  nodeName: string;
}

export type OpenNodeShellSession = (args: NodeShellSessionArgs) => Promise<void>;

const openNodeShellSessionInjectable = getInjectable({
  id: "open-node-shell-session",
  instantiate: (di): OpenNodeShellSession => {
    const createKubectl = di.inject(createKubectlInjectable);
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const dependencies: Omit<
      NodeShellSessionDependencies,
      "proxyKubeconfigPath" | "proxyCacheDirectoryPath" | "loadProxyKubeconfig" | "kubeTools"
    > = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      logger: di.inject(loggerInjectionToken),
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      createKubeJsonApiForCluster: di.inject(createKubeJsonApiForClusterInjectable),
      computeUserShellEnvironment: di.inject(computeUserShellEnvironmentInjectable),
      getUserShell: di.inject(getUserShellInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      stat: di.inject(statInjectable),
      createKubeApi: di.inject(createKubeApiInjectable),
      freelensProxyToken: di.inject(freelensProxyTokenInjectable).value,
    };

    return async (args) => {
      // Before the first await, so that a tab closed during any of them is seen.
      const signal = websocketClosedSignal(args.websocket);
      const closed = (stage: string) =>
        closedDuring(signal, dependencies.logger, `${args.cluster.id}:${args.tabId}`, stage);
      const kubectl = createKubectl(args.cluster.version.get());
      const kubeconfigManager = di.inject(kubeconfigManagerInjectable, args.cluster);
      const loadProxyKubeconfig = di.inject(loadProxyKubeconfigInjectable, args.cluster);
      const status = terminalStatusReporterFor(args.websocket);

      status.info("Starting cluster proxy ...");
      const { kubeconfigPath: proxyKubeconfigPath, cacheDirectoryPath: proxyCacheDirectoryPath } =
        await kubeconfigManager.ensurePaths();

      if (closed("starting the cluster proxy")) {
        return;
      }

      const kubectlStatus = kubectlStatusOptionsFor(kubectl.kubectlVersion, status);

      status.info(`Checking kubectl v${kubectl.kubectlVersion} ...`);

      const kubeTools = await resolveKubeTools.forCluster(kubectl, kubectlStatus).finally(() => kubectlStatus.done());

      if (closed(`checking kubectl v${kubectl.kubectlVersion}`)) {
        return;
      }

      const session = new NodeShellSession(
        {
          ...dependencies,
          loadProxyKubeconfig,
          proxyKubeconfigPath,
          proxyCacheDirectoryPath,
          kubeTools,
        },
        { kubectl, ...args, signal },
      );

      return session.open();
    };
  },
});

export default openNodeShellSessionInjectable;
