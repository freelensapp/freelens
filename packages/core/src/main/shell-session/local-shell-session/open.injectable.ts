/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import freelensProxyTokenInjectable from "../../freelens-proxy/freelens-proxy-token.injectable";
import computeUserShellEnvironmentInjectable from "../../kube-tools/compute-user-shell-environment.injectable";
import getUserShellInjectable from "../../kube-tools/get-user-shell.injectable";
import resolveKubeToolsInjectable from "../../kube-tools/resolve-kube-tools.injectable";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../processes.injectable";
import { kubectlStatusOptionsFor, messageOfError, terminalStatusReporterFor } from "../send-terminal-status";
import modifyTerminalShellEnvInjectable from "../shell-env-modifier/modify-terminal-shell-env.injectable";
import shellSessionEnvsInjectable from "../shell-envs.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import { closedDuring, websocketClosedSignal } from "../websocket-closed";
import { LocalShellSession } from "./local-shell-session";

import type WebSocket from "ws";

import type { Cluster } from "../../../common/cluster/cluster";
import type { LocalShellSessionDependencies } from "./local-shell-session";

export interface OpenLocalShellSessionArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
}

export type OpenLocalShellSession = (args: OpenLocalShellSessionArgs) => Promise<void>;

const openLocalShellSessionInjectable = getInjectable({
  id: "open-local-shell-session",

  instantiate: (di): OpenLocalShellSession => {
    const createKubectl = di.inject(createKubectlInjectable);
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const logger = di.inject(loggerInjectionToken);
    const dependencies: Omit<
      LocalShellSessionDependencies,
      "proxyKubeconfigPath" | "proxyCacheDirectoryPath" | "kubeTools" | "shellInitDirectory"
    > = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      logger,
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      modifyTerminalShellEnv: di.inject(modifyTerminalShellEnvInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      joinPaths: di.inject(joinPathsInjectable),
      getBasenameOfPath: di.inject(getBasenameOfPathInjectable),
      computeUserShellEnvironment: di.inject(computeUserShellEnvironmentInjectable),
      getUserShell: di.inject(getUserShellInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      stat: di.inject(statInjectable),
      freelensProxyToken: di.inject(freelensProxyTokenInjectable).value,
    };

    return async (args) => {
      // Before the first await, so that a tab closed during any of them is seen.
      const signal = websocketClosedSignal(args.websocket);
      const closed = (stage: string) => closedDuring(signal, logger, `${args.cluster.id}:${args.tabId}`, stage);
      const kubectl = createKubectl(args.cluster.version.get());
      const kubeconfigManager = di.inject(kubeconfigManagerInjectable, args.cluster);
      // The websocket is already upgraded and writable here, long before the
      // PTY exists, which is exactly the stretch that used to be silent.
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

      const shellInitDirectory = await kubectl.writeInitScripts(kubeTools).catch((error) => {
        logger.error("[LOCAL-SHELL]: failed to write the shell init scripts", error);
        status.error(
          `Failed to write the shell init scripts for kubectl v${kubectl.kubectlVersion} (${messageOfError(error)}) - ` +
            "starting the shell without them",
        );

        return undefined;
      });

      if (closed("writing the shell init scripts")) {
        return;
      }

      const session = new LocalShellSession(
        {
          ...dependencies,
          kubeTools,
          proxyKubeconfigPath,
          proxyCacheDirectoryPath,
          shellInitDirectory,
        },
        { kubectl, ...args, signal },
      );

      return session.open();
    };
  },
});

export default openLocalShellSessionInjectable;
