/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import type WebSocket from "ws";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import directoryForBinariesInjectable from "../../../common/app-paths/directory-for-binaries/directory-for-binaries.injectable";
import type { Cluster } from "../../../common/cluster/cluster";
import statInjectable from "../../../common/fs/stat.injectable";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import getDirnameOfPathInjectable from "../../../common/path/get-dirname.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import defaultShellInjectable from "../../../common/vars/default-shell.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import kubeconfigManagerInjectable from "../../kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../kubectl/create-kubectl.injectable";
import shellSessionProcessesInjectable from "../processes.injectable";
import modifyTerminalShellEnvInjectable from "../shell-env-modifier/modify-terminal-shell-env.injectable";
import shellSessionEnvsInjectable from "../shell-envs.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import type { LocalShellSessionDependencies } from "./local-shell-session";
import { LocalShellSession } from "./local-shell-session";

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
    const dependencies: Omit<LocalShellSessionDependencies, "proxyKubeconfigPath" | "directoryContainingKubectl"> = {
      directoryForBinaries: di.inject(directoryForBinariesInjectable),
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      defaultShell: di.inject(defaultShellInjectable),
      logger: di.inject(loggerInjectionToken),
      state: di.inject(userPreferencesStateInjectable),
      userShellSetting: di.inject(userShellSettingInjectable),
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      modifyTerminalShellEnv: di.inject(modifyTerminalShellEnvInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      getDirnameOfPath: di.inject(getDirnameOfPathInjectable),
      joinPaths: di.inject(joinPathsInjectable),
      getBasenameOfPath: di.inject(getBasenameOfPathInjectable),
      computeShellEnvironment: di.inject(computeShellEnvironmentInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      stat: di.inject(statInjectable),
    };

    return async (args) => {
      const kubectl = createKubectl(args.cluster.version.get());
      const kubeconfigManager = di.inject(kubeconfigManagerInjectable, args.cluster);
      const proxyKubeconfigPath = await kubeconfigManager.ensurePath();
      const directoryContainingKubectl = await kubectl.binDir();

      const session = new LocalShellSession(
        {
          ...dependencies,
          proxyKubeconfigPath,
          directoryContainingKubectl,
        },
        { kubectl, ...args },
      );

      return session.open();
    };
  },
});

export default openLocalShellSessionInjectable;
