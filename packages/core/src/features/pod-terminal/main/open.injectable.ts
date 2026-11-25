/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
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
import { PodTerminalSession } from "./pod-terminal-session";

import type WebSocket from "ws";

import type { Cluster } from "../../../common/cluster/cluster";
import type { PodTerminalTarget } from "../common/pod-terminal";
import type { PodTerminalSessionDependencies } from "./pod-terminal-session";

export interface OpenPodTerminalSessionArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
  target: PodTerminalTarget;
}

export type OpenPodTerminalSession = (args: OpenPodTerminalSessionArgs) => Promise<void>;

const openPodTerminalSessionInjectable = getInjectable({
  id: "open-pod-terminal-session",

  instantiate: (di): OpenPodTerminalSession => {
    const createKubectl = di.inject(createKubectlInjectable);
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const logger = di.inject(loggerInjectionToken);
    const dependencies: Omit<
      PodTerminalSessionDependencies,
      "proxyKubeconfigPath" | "proxyCacheDirectoryPath" | "kubeTools"
    > = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      logger,
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      computeUserShellEnvironment: di.inject(computeUserShellEnvironmentInjectable),
      getUserShell: di.inject(getUserShellInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      stat: di.inject(statInjectable),
      execFile: di.inject(execFileInjectable),
      freelensProxyToken: di.inject(freelensProxyTokenInjectable).value,
    };

    return async (args) => {
      // Before the first await, so that a tab closed during any of them is seen.
      const signal = websocketClosedSignal(args.websocket);
      const closed = (stage: string) => closedDuring(signal, logger, `${args.cluster.id}:${args.tabId}`, stage);
      const kubectl = createKubectl(args.cluster.version.get());
      const kubeconfigManager = di.inject(kubeconfigManagerInjectable, args.cluster);
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

      const session = new PodTerminalSession(
        {
          ...dependencies,
          kubeTools,
          proxyKubeconfigPath,
          proxyCacheDirectoryPath,
        },
        { kubectl, ...args, signal },
      );

      return session.open();
    };
  },
});

export default openPodTerminalSessionInjectable;
