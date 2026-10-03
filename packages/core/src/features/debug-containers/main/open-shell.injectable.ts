/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import defaultShellInjectable from "../../../common/vars/default-shell.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../../../main/shell-session/processes.injectable";
import { kubectlStatusOptionsFor, terminalStatusReporterFor } from "../../../main/shell-session/send-terminal-status";
import shellSessionEnvsInjectable from "../../../main/shell-session/shell-envs.injectable";
import spawnPtyInjectable from "../../../main/shell-session/spawn-pty.injectable";
import computeShellEnvironmentInjectable from "../../shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../user-preferences/common/shell-setting.injectable";
import { buildVersionInitializable } from "../../vars/build-version/common/token";
import debugContainersInjectable from "./debug-containers.injectable";
import { DebugContainerShellSession } from "./shell-session";

import type WebSocket from "ws";

import type { Cluster } from "../../../common/cluster/cluster";
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
    const dependencies = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      defaultShell: di.inject(defaultShellInjectable),
      logger: di.inject(loggerInjectionToken),
      userShellSetting: di.inject(userShellSettingInjectable),
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      computeShellEnvironment: di.inject(computeShellEnvironmentInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      stat: di.inject(statInjectable),
    };

    return async (args: OpenDebugContainerShellArgs) => {
      const status = terminalStatusReporterFor(args.websocket);
      const kubectl = createKubectl(args.cluster.version.get());

      status.info("Preparing debug container shell ...");
      const proxyKubeconfigPath = await di.inject(kubeconfigManagerInjectable, args.cluster).ensurePath();
      const downloadStatus = kubectlStatusOptionsFor(kubectl.kubectlVersion, status);
      const directoryContainingKubectl = await kubectl.binDir(downloadStatus).finally(() => downloadStatus.done());
      const { status: containerStatus } = await di
        .inject(debugContainersInjectable, args.cluster)
        .getManagedContainer(args.debugContainer);

      if (!containerStatus?.state?.running) throw new Error("The debug container is no longer running.");
      if (args.websocket.readyState !== args.websocket.OPEN) return;
      return new DebugContainerShellSession(
        { ...dependencies, proxyKubeconfigPath, directoryContainingKubectl },
        { ...args, kubectl },
      ).open();
    };
  },
});

export default openDebugContainerShellInjectable;
