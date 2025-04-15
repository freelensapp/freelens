/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import type WebSocket from "ws";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import type { Cluster } from "../../../common/cluster/cluster";
import statInjectable from "../../../common/fs/stat.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import createKubeJsonApiForClusterInjectable from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import defaultShellInjectable from "../../../common/vars/default-shell.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import loadProxyKubeconfigInjectable from "../../cluster/load-proxy-kubeconfig.injectable";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../processes.injectable";
import shellSessionEnvsInjectable from "../shell-envs.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import type { NodeShellSessionDependencies } from "./node-shell-session";
import { NodeShellSession } from "./node-shell-session";

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
    const dependencies: Omit<
      NodeShellSessionDependencies,
      "proxyKubeconfigPath" | "loadProxyKubeconfig" | "directoryContainingKubectl"
    > = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      defaultShell: di.inject(defaultShellInjectable),
      logger: di.inject(loggerInjectionToken),
      userShellSetting: di.inject(userShellSettingInjectable),
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      createKubeJsonApiForCluster: di.inject(createKubeJsonApiForClusterInjectable),
      computeShellEnvironment: di.inject(computeShellEnvironmentInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      stat: di.inject(statInjectable),
      createKubeApi: di.inject(createKubeApiInjectable),
    };

    return async (args) => {
      const kubectl = createKubectl(args.cluster.version.get());
      const kubeconfigManager = di.inject(kubeconfigManagerInjectable, args.cluster);
      const loadProxyKubeconfig = di.inject(loadProxyKubeconfigInjectable, args.cluster);
      const proxyKubeconfigPath = await kubeconfigManager.ensurePath();
      const directoryContainingKubectl = await kubectl.binDir();

      const session = new NodeShellSession(
        {
          ...dependencies,
          loadProxyKubeconfig,
          proxyKubeconfigPath,
          directoryContainingKubectl,
        },
        { kubectl, ...args },
      );

      return session.open();
    };
  },
});

export default openNodeShellSessionInjectable;
