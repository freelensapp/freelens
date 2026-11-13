/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import createCanIInjectable from "../../../common/cluster/create-can-i.injectable";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import loadProxyKubeconfigInjectable from "../../../main/cluster/load-proxy-kubeconfig.injectable";
import freelensProxyPortInjectable from "../../../main/freelens-proxy/freelens-proxy-port.injectable";
import freelensProxyTokenInjectable from "../../../main/freelens-proxy/freelens-proxy-token.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import resolveKubeToolsInjectable from "../../../main/kube-tools/resolve-kube-tools.injectable";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import { buildVersionStateInjectable } from "../../vars/build-version/main/init.injectable";
import { buildDebugContainer } from "../common/debug-container";
import { debugRequest, debugTestPod } from "../test-utils";
import debugContainersInjectable from "./debug-containers.injectable";
import openDebugContainerShellInjectable from "./open-shell.injectable";
import { DebugContainerShellSession } from "./shell-session";

import type { KubeConfig } from "@kubernetes/client-node";
import type { DiContainer } from "@ogre-tools/injectable";
import type WebSocket from "ws";

import type { CreateKubeApi } from "../../../common/k8s-api/create-kube-api.injectable";
import type { KubeconfigManager } from "../../../main/kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../../../main/kubectl/kubectl";
import type { DebugContainers } from "./debug-containers";

describe("debugger access through the v2 cluster proxy", () => {
  let di: DiContainer;
  let socket: WebSocket;
  let events: EventEmitter;
  const paths = { kubeconfigPath: "/proxy/config", cacheDirectoryPath: "/proxy/cache" };
  const tools = { kubectlPath: "/tools/kubectl", helmPath: "/tools/helm", pathPrefix: [], pathSuffix: [] };
  const ensurePaths = vi.fn();
  const resolveTools = vi.fn();
  const getManagedContainer = vi.fn();
  const execFile = vi.fn();
  const cluster = new Cluster({ id: "test-cluster", contextName: "test", kubeConfigPath: "/test/config" });

  beforeEach(() => {
    vi.resetAllMocks();
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/test-user-data");
    di.override(directoryForTempInjectable, () => "/test-tmp");
    di.override(baseBundledBinariesDirectoryInjectable, () => "/bundled-tools");
    di.override(buildVersionStateInjectable, () => "test-version");
    di.override(freelensProxyTokenInjectable, () => ({ value: "test-token", matches: () => true }));
    di.inject(freelensProxyPortInjectable).set(1111);
    ensurePaths.mockResolvedValue(paths);
    resolveTools.mockResolvedValue(tools);
    getManagedContainer.mockResolvedValue({ status: { state: { running: {} } } });
    execFile.mockResolvedValue({ callWasSuccessful: true, response: "" });
    di.override(kubeconfigManagerInjectable, () => ({ ensurePaths }) as unknown as KubeconfigManager);
    di.override(
      createKubectlInjectable,
      () => () =>
        ({
          kubectlVersion: "1.36.0",
          ensureKubectl: vi.fn(),
          getPath: async () => tools.kubectlPath,
        }) as unknown as Kubectl,
    );
    di.override(resolveKubeToolsInjectable, () => ({ forCluster: resolveTools, withoutCluster: () => tools }));
    di.override(execFileInjectable, () => execFile);
    events = new EventEmitter();
    socket = Object.assign(events, { send: vi.fn(), readyState: 1, OPEN: 1 }) as unknown as WebSocket;
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["proxy", "tools", "pod", "open"])("handles the terminal lifecycle at the %s stage", async (stage) => {
    di.override(debugContainersInjectable, () => ({ getManagedContainer }) as unknown as DebugContainers);
    const open = vi.spyOn(DebugContainerShellSession.prototype, "open").mockResolvedValue();
    if (stage === "proxy")
      ensurePaths.mockImplementation(async () => {
        events.emit("close");
        return paths;
      });
    if (stage === "tools")
      resolveTools.mockImplementation(async () => {
        events.emit("close");
        return tools;
      });
    if (stage === "pod")
      getManagedContainer.mockImplementation(async () => {
        events.emit("close");
        return {};
      });

    await di.inject(openDebugContainerShellInjectable)({
      websocket: socket,
      cluster,
      tabId: "debug-tab",
      debugContainer: debugRequest,
    });

    expect(open).toHaveBeenCalledTimes(stage === "open" ? 1 : 0);
    if (stage === "proxy") expect(resolveTools).not.toHaveBeenCalled();
    if (stage === "proxy" || stage === "tools") expect(getManagedContainer).not.toHaveBeenCalled();
  });

  it("passes proxy credentials and its isolated cache to the stop command", async () => {
    const pod = debugTestPod({ running: { startedAt: "now" } });
    pod.spec.ephemeralContainers = [buildDebugContainer(debugRequest)];
    di.override(createKubeApiInjectable, () => (() => ({ get: async () => pod })) as unknown as CreateKubeApi);
    di.override(loadProxyKubeconfigInjectable, () => async () => ({ makeApiClient: vi.fn() }) as unknown as KubeConfig);
    di.override(createCanIInjectable, () => () => async () => true);

    await di.inject(debugContainersInjectable, cluster).stop(debugRequest);

    expect(execFile).toHaveBeenCalledOnce();
    const [file, args, options] = execFile.mock.calls[0];
    expect(file).toBe(tools.kubectlPath);
    expect(args.slice(0, 2)).toEqual(["--kubeconfig", paths.kubeconfigPath]);
    expect(options.env.FREELENS_PROXY_TOKEN).toBe("test-token");
    expect(options.env.KUBECACHEDIR).toBe(paths.cacheDirectoryPath);
  });
});
