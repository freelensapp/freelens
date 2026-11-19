/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { PodApi } from "@freelensapp/kube-api";
import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import emitAppEventInjectable from "../../../common/app-event-bus/emit-event.injectable";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import statInjectable from "../../../common/fs/stat.injectable";
import unlinkInjectable from "../../../common/fs/unlink.injectable";
import writeFileInjectable from "../../../common/fs/write-file.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import createKubeJsonApiForClusterInjectable from "../../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import appNameInjectable from "../../../common/vars/app-name.injectable";
import isMacInjectable from "../../../common/vars/is-mac.injectable";
import isWindowsInjectable from "../../../common/vars/is-windows.injectable";
import freelensProxyTokenInjectable from "../../../main/freelens-proxy/freelens-proxy-token.injectable";
import withFreelensProxyCredentialEnvInjectable from "../../../main/freelens-proxy/with-freelens-proxy-credential-env.injectable";
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
import { debugContainerCreateArgs } from "../common/debug-container";
import { DebugContainerShellSession } from "./shell-session";

import type WebSocket from "ws";

import type { Cluster } from "../../../common/cluster/cluster";
import type { ShellSessionDependencies } from "../../../main/shell-session/shell-session";
import type { DebugContainerSpec } from "../common/debug-container";

/**
 * How long a session waits for a debug container to start, which includes pulling its image.
 */
const startTimeout = 5 * 60 * 1000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface OpenDebugContainerShellArgs {
  websocket: WebSocket;
  cluster: Cluster;
  tabId: string;
  debugContainer: DebugContainerSpec;
}

const openDebugContainerShellInjectable = getInjectable({
  id: "open-debug-container-shell",
  instantiate: (di) => {
    const createKubectl = di.inject(createKubectlInjectable);
    const resolveKubeTools = di.inject(resolveKubeToolsInjectable);
    const createKubeApi = di.inject(createKubeApiInjectable);
    const createKubeJsonApiForCluster = di.inject(createKubeJsonApiForClusterInjectable);
    const directoryForTemp = di.inject(directoryForTempInjectable);
    const writeFile = di.inject(writeFileInjectable);
    const unlink = di.inject(unlinkInjectable);
    const execFile = di.inject(execFileInjectable);
    const withProxyCredentialEnv = di.inject(withFreelensProxyCredentialEnvInjectable);
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

    return async ({ debugContainer, ...args }: OpenDebugContainerShellArgs) => {
      const signal = websocketClosedSignal(args.websocket);
      const closed = (stage: string) =>
        closedDuring(signal, dependencies.logger, `${args.cluster.id}:${args.tabId}`, stage);
      const status = terminalStatusReporterFor(args.websocket);
      const kubectl = createKubectl(args.cluster.version.get());

      status.info("Preparing debug container ...");
      const { kubeconfigPath: proxyKubeconfigPath, cacheDirectoryPath: proxyCacheDirectoryPath } = await di
        .inject(kubeconfigManagerInjectable, args.cluster)
        .ensurePaths();

      if (closed("starting the cluster proxy")) return;

      const downloadStatus = kubectlStatusOptionsFor(kubectl.kubectlVersion, status);
      const kubeTools = await resolveKubeTools.forCluster(kubectl, downloadStatus).finally(() => downloadStatus.done());

      if (closed("preparing kubectl")) return;

      const podApi = createKubeApi(PodApi, { request: createKubeJsonApiForCluster(args.cluster.id) });
      const createContainer = async () => {
        const customFile = debugContainer.custom
          ? path.join(directoryForTemp, `${debugContainer.container}.custom.yaml`)
          : undefined;

        try {
          if (customFile) await writeFile(customFile, debugContainer.custom!, { mode: 0o600 });

          const result = await execFile(
            kubeTools.kubectlPath,
            ["--kubeconfig", proxyKubeconfigPath, ...debugContainerCreateArgs(debugContainer, customFile)],
            {
              timeout: 60_000,
              windowsHide: true,
              env: withProxyCredentialEnv({ ...process.env, KUBECACHEDIR: proxyCacheDirectoryPath }),
            },
          );

          if (!result.callWasSuccessful) throw new Error(result.error.stderr.trim() || result.error.message);
        } finally {
          if (customFile) await unlink(customFile).catch(() => {});
        }
      };

      // A restored or reconnected tab attaches to the container it created before: a pod can never
      // remove an ephemeral container, so creating one each time would pile them up.
      for (let created = false, started = Date.now(); ; ) {
        const pod = await podApi.get({ name: debugContainer.pod, namespace: debugContainer.namespace });

        if (closed("reading the pod")) return;

        if (!pod || pod.getId() !== debugContainer.podUid) {
          throw new Error(`The pod ${debugContainer.pod} was deleted or replaced. Open a new debugger from its menu.`);
        }

        const exists = pod.spec?.ephemeralContainers?.some(({ name }) => name === debugContainer.container);
        const state = pod.status?.ephemeralContainerStatuses?.find(
          ({ name }) => name === debugContainer.container,
        )?.state;

        if (state?.running) break;

        if (state?.terminated) {
          throw new Error(
            `The debug container ${debugContainer.container} has exited (${state.terminated.reason ?? `code ${state.terminated.exitCode}`}). Open a new debugger from the menu of the pod.`,
          );
        }

        if (!exists) {
          if (created) throw new Error(`The debug container ${debugContainer.container} was not added to the pod.`);
          status.info(`Adding ${debugContainer.container} to the pod ...`);
          await createContainer();
          created = true;

          if (closed("adding the debug container")) return;
          continue;
        }

        if (Date.now() - started > startTimeout) {
          throw new Error(
            `The debug container ${debugContainer.container} has not started. It stays in the pod; restart the session to attach once it runs.`,
          );
        }

        status.info(
          state?.waiting
            ? `Waiting for ${debugContainer.container}: ${state.waiting.message || state.waiting.reason}`
            : `Waiting for ${debugContainer.container} to start ...`,
        );
        await delay(1000);

        if (closed("waiting for the debug container")) return;
      }

      return new DebugContainerShellSession(
        { ...dependencies, proxyKubeconfigPath, proxyCacheDirectoryPath, kubeTools },
        { ...args, kubectl, signal, debugContainer },
      ).open();
    };
  },
});

export default openDebugContainerShellInjectable;
