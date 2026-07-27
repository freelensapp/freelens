/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import directoryForBinariesInjectable from "../../../common/app-paths/directory-for-binaries/directory-for-binaries.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import getBasenameOfPathInjectable from "../../../common/path/get-basename.injectable";
import getDirnameOfPathInjectable from "../../../common/path/get-dirname.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import bundledBinaryPathInjectable from "../../../common/utils/bundled-binary-path.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import defaultShellInjectable from "../../../common/vars/default-shell.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import computeShellEnvironmentInjectable from "../../../features/shell-sync/main/compute-shell-environment.injectable";
import userShellSettingInjectable from "../../../features/user-preferences/common/shell-setting.injectable";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import bundledKubectlBinaryPathInjectable from "../../kubectl/bundled-binary-path.injectable";
import { LocalShellSession } from "../local-shell-session/local-shell-session";
import shellSessionProcessesInjectable from "../processes.injectable";
import modifyTerminalShellEnvInjectable from "../shell-env-modifier/modify-terminal-shell-env.injectable";
import shellSessionEnvsInjectable from "../shell-envs.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";

import type WebSocket from "ws";

import type { LocalShellSessionDependencies } from "../local-shell-session/local-shell-session";

export interface OpenStandaloneShellSessionArgs {
  websocket: WebSocket;
  tabId: string;
}

export type OpenStandaloneShellSession = (args: OpenStandaloneShellSessionArgs) => Promise<void>;

/**
 * A shell that belongs to no cluster: it runs with the user's own kubeconfig
 * and the user's own tools, so it needs neither a proxy kubeconfig nor a
 * version-matched kubectl. Freelens' bundled kubectl and helm are only
 * appended to `PATH`, as a fallback for a machine that has neither.
 */
const openStandaloneShellSessionInjectable = getInjectable({
  id: "open-standalone-shell-session",

  instantiate: (di): OpenStandaloneShellSession => {
    const state = di.inject(userPreferencesStateInjectable);
    const bundledKubectlBinaryPath = di.inject(bundledKubectlBinaryPathInjectable);
    // Not `helmBinaryPathInjectable`: that resolves the preference once, when
    // the injectable is instantiated, and a terminal opened after the user
    // changed it would still get the previous binary.
    const bundledHelmBinaryPath = di.inject(bundledBinaryPathInjectable, "helm");
    const directoryForBinaries = di.inject(directoryForBinariesInjectable);
    const getDirnameOfPath = di.inject(getDirnameOfPathInjectable);
    const dependencies: Omit<
      LocalShellSessionDependencies,
      "proxyKubeconfigPath" | "directoryContainingKubectl" | "pathSuffixEntries"
    > = {
      directoryForBinaries,
      baseBundledBinariesDirectory: di.inject(baseBundledBinariesDirectoryInjectable),
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      defaultShell: di.inject(defaultShellInjectable),
      logger: di.inject(loggerInjectionToken),
      state,
      userShellSetting: di.inject(userShellSettingInjectable),
      appName: di.inject(appNameInjectable),
      buildVersion: di.inject(buildVersionInitializable.stateToken),
      shellSessionEnvs: di.inject(shellSessionEnvsInjectable),
      shellSessionProcesses: di.inject(shellSessionProcessesInjectable),
      modifyTerminalShellEnv: di.inject(modifyTerminalShellEnvInjectable),
      emitAppEvent: di.inject(emitAppEventInjectable),
      getDirnameOfPath,
      joinPaths: di.inject(joinPathsInjectable),
      getBasenameOfPath: di.inject(getBasenameOfPathInjectable),
      computeShellEnvironment: di.inject(computeShellEnvironmentInjectable),
      spawnPty: di.inject(spawnPtyInjectable),
      stat: di.inject(statInjectable),
    };

    return (args) => {
      const kubectlPath = state.kubectlBinariesPath || bundledKubectlBinaryPath;
      const helmPath = state.helmBinariesPath || bundledHelmBinaryPath;
      // Both bundled binaries live in the same directory, so the set keeps the
      // suffix down to what it actually adds.
      const pathSuffixEntries = [
        ...new Set([getDirnameOfPath(kubectlPath), getDirnameOfPath(helmPath), directoryForBinaries]),
      ];

      const session = new LocalShellSession({ ...dependencies, pathSuffixEntries }, args);

      return session.open();
    };
  },
});

export default openStandaloneShellSessionInjectable;
