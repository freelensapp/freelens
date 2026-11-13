/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import freelensProxyTokenInjectable from "../../../main/freelens-proxy/freelens-proxy-token.injectable";
import computeUserShellEnvironmentInjectable from "../../../main/kube-tools/compute-user-shell-environment.injectable";
import getUserShellInjectable from "../../../main/kube-tools/get-user-shell.injectable";
import resolveKubeToolsInjectable from "../../../main/kube-tools/resolve-kube-tools.injectable";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../../../main/shell-session/processes.injectable";
import { kubectlStatusOptionsFor, terminalStatusReporterFor } from "../../../main/shell-session/send-terminal-status";
import shellSessionEnvsInjectable from "../../../main/shell-session/shell-envs.injectable";
import spawnPtyInjectable from "../../../main/shell-session/spawn-pty.injectable";
import { closedDuring, websocketClosedSignal } from "../../../main/shell-session/websocket-closed";
import { buildVersionInitializable } from "../../vars/build-version/common/token";
import debugContainersInjectable from "./debug-containers.injectable";
import { DebugContainerShellSession } from "./shell-session";

import type WebSocket from "ws";

import type { Cluster } from "../../../common/cluster/cluster";
import type { ShellSessionDependencies } from "../../../main/shell-session/shell-session";
import type { DebugContainerReference } from "../common/debug-container";

export interface OpenDebugContainerShellArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
  debugContainer: DebugContainerReference;
}

const openDebugContainerShellInjectable = getInjectable({
  id: "open-debug-container-shell",
  instantiate: (di) => {
    const createKubectl = di.inject(createKubectlInjectable);
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const dependencies: Omit<ShellSessionDependencies, "kubeTools"> = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      logger: di.inject(loggerInjectionToken),
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      computeUserShellEnvironment: di.inject(computeUserShellEnvironmentInjectable),
      getUserShell: di.inject(getUserShellInjectable),
      freelensProxyToken: di.inject(freelensProxyTokenInjectable).value,
      spawnPty: di.inject(spawnPtyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      stat: di.inject(statInjectable),
    };

    return async (args: OpenDebugContainerShellArgs) => {
      const signal = websocketClosedSignal(args.websocket);
      const closed = (stage: string) =>
        closedDuring(signal, dependencies.logger, `${args.cluster.id}:${args.tabId}`, stage);
      const status = terminalStatusReporterFor(args.websocket);
      const kubectl = createKubectl(args.cluster.version.get());

      status.info("Preparing debug container shell ...");
      const { kubeconfigPath: proxyKubeconfigPath, cacheDirectoryPath: proxyCacheDirectoryPath } = await di
        .inject(kubeconfigManagerInjectable, args.cluster)
        .ensurePaths();

      if (closed("starting the cluster proxy")) return;
      const downloadStatus = kubectlStatusOptionsFor(kubectl.kubectlVersion, status);
      const kubeTools = await resolveKubeTools.forCluster(kubectl, downloadStatus).finally(() => downloadStatus.done());

      if (closed("preparing kubectl")) return;
      const { status: containerStatus } = await di
        .inject(debugContainersInjectable, args.cluster)
        .getManagedContainer(args.debugContainer);

      if (closed("checking the debug container")) return;
      if (!containerStatus?.state?.running) throw new Error("The debug container is no longer running.");
      if (args.websocket.readyState !== args.websocket.OPEN) return;
      return new DebugContainerShellSession(
        { ...dependencies, proxyKubeconfigPath, proxyCacheDirectoryPath, kubeTools },
        { ...args, kubectl, signal },
      ).open();
    };
  },
});

export default openDebugContainerShellInjectable;
