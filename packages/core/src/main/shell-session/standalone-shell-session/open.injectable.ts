/**
 * Copyright (c) Freelens Authors. All rights reserved.
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
import httpsProxyConfigurationInjectable from "../../../features/user-preferences/common/https-proxy.injectable";
import { buildVersionInitializable } from "../../../features/vars/build-version/common/token";
import freelensProxyTokenInjectable from "../../freelens-proxy/freelens-proxy-token.injectable";
import computeUserShellEnvironmentInjectable from "../../kube-tools/compute-user-shell-environment.injectable";
import getUserShellInjectable from "../../kube-tools/get-user-shell.injectable";
import resolveKubeToolsInjectable from "../../kube-tools/resolve-kube-tools.injectable";
import { LocalShellSession } from "../local-shell-session/local-shell-session";
import shellSessionProcessesInjectable from "../processes.injectable";
import modifyTerminalShellEnvInjectable from "../shell-env-modifier/modify-terminal-shell-env.injectable";
import shellSessionEnvsInjectable from "../shell-envs.injectable";
import spawnPtyInjectable from "../spawn-pty.injectable";
import { websocketClosedSignal } from "../websocket-closed";

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
 * version-matched kubectl. Freelens' bundled binaries directory is only
 * appended to `PATH`, as a fallback for a machine that has neither kubectl nor
 * helm.
 */
const openStandaloneShellSessionInjectable = getInjectable({
  id: "open-standalone-shell-session",

  instantiate: (di): OpenStandaloneShellSession => {
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const dependencies: Omit<
      LocalShellSessionDependencies,
      "proxyKubeconfigPath" | "proxyCacheDirectoryPath" | "kubeTools" | "shellInitDirectory"
    > = {
      isMac: di.inject(isMacInjectable),
      isWindows: di.inject(isWindowsInjectable),
      logger: di.inject(loggerInjectionToken),
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
      applicationHttpsProxy: di.inject(httpsProxyConfigurationInjectable),
    };

    return (args) => {
      // Resolved per session, so that a terminal opened after the user changed
      // a preference gets the binary it now names.
      const session = new LocalShellSession(
        { ...dependencies, kubeTools: resolveKubeTools.withoutCluster() },
        { ...args, signal: websocketClosedSignal(args.websocket) },
      );

      return session.open();
    };
  },
});

export default openStandaloneShellSessionInjectable;
