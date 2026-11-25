/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForTempInjectable from "../../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { Cluster } from "../../../common/cluster/cluster";
import execFileInjectable from "../../../common/fs/exec-file.injectable";
import unlinkInjectable from "../../../common/fs/unlink.injectable";
import writeFileInjectable from "../../../common/fs/write-file.injectable";
import createKubeApiInjectable from "../../../common/k8s-api/create-kube-api.injectable";
import baseBundledBinariesDirectoryInjectable from "../../../common/vars/base-bundled-binaries-dir.injectable";
import freelensProxyPortInjectable from "../../../main/freelens-proxy/freelens-proxy-port.injectable";
import freelensProxyTokenInjectable from "../../../main/freelens-proxy/freelens-proxy-token.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import resolveKubeToolsInjectable from "../../../main/kube-tools/resolve-kube-tools.injectable";
import kubeconfigManagerInjectable from "../../../main/kubeconfig-manager/kubeconfig-manager.injectable";
import createKubectlInjectable from "../../../main/kubectl/create-kubectl.injectable";
import { buildVersionStateInjectable } from "../../vars/build-version/main/init.injectable";
import { debugSpec, debugTestPod } from "../test-utils";
import openDebugContainerShellInjectable from "./open-shell.injectable";
import { DebugContainerShellSession } from "./shell-session";

import type { DiContainer } from "@ogre-tools/injectable";
import type WebSocket from "ws";

import type { CreateKubeApi } from "../../../common/k8s-api/create-kube-api.injectable";
import type { KubeconfigManager } from "../../../main/kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../../../main/kubectl/kubectl";
import type { DebugContainerSpec } from "../common/debug-container";

describe("opening a debug container terminal", () => {
  let di: DiContainer;
  let socket: WebSocket;
  let events: EventEmitter;
  const paths = { kubeconfigPath: "/proxy/config", cacheDirectoryPath: "/proxy/cache" };
  const tools = { kubectlPath: "/tools/kubectl", helmPath: "/tools/helm", pathPrefix: [], pathSuffix: [] };
  const ensurePaths = vi.fn();
  const resolveTools = vi.fn();
  const getPod = vi.fn();
  const execFile = vi.fn();
  const writeFile = vi.fn();
  const unlink = vi.fn();
  const cluster = new Cluster({ id: "test-cluster", contextName: "test", kubeConfigPath: "/test/config" });
  let open: ReturnType<typeof vi.spyOn>;

  const openShell = (debugContainer: DebugContainerSpec = debugSpec) =>
    di.inject(openDebugContainerShellInjectable)({ websocket: socket, cluster, tabId: "debug-tab", debugContainer });

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
    execFile.mockResolvedValue({ callWasSuccessful: true, response: "" });
    writeFile.mockResolvedValue(undefined);
    unlink.mockResolvedValue(undefined);
    di.override(kubeconfigManagerInjectable, () => ({ ensurePaths }) as unknown as KubeconfigManager);
    di.override(
      createKubectlInjectable,
      () => () => ({ kubectlVersion: "1.36.0", getPath: async () => tools.kubectlPath }) as unknown as Kubectl,
    );
    di.override(resolveKubeToolsInjectable, () => ({ forCluster: resolveTools, withoutCluster: () => tools }));
    di.override(createKubeApiInjectable, () => (() => ({ get: getPod })) as unknown as CreateKubeApi);
    di.override(execFileInjectable, () => execFile);
    di.override(writeFileInjectable, () => writeFile);
    di.override(unlinkInjectable, () => unlink);
    events = new EventEmitter();
    socket = Object.assign(events, { send: vi.fn(), readyState: 1, OPEN: 1 }) as unknown as WebSocket;
    open = vi.spyOn(DebugContainerShellSession.prototype, "open").mockResolvedValue();
  });

  afterEach(() => vi.restoreAllMocks());

  it("adds the container with kubectl debug, then attaches to it", async () => {
    getPod.mockResolvedValueOnce(debugTestPod()).mockResolvedValueOnce(debugTestPod({ running: { startedAt: "now" } }));

    await openShell({ ...debugSpec, profile: "netadmin", env: ["A=1"] });

    expect(execFile).toHaveBeenCalledOnce();
    const [file, args, options] = execFile.mock.calls[0];

    expect(file).toBe(tools.kubectlPath);
    expect(args).toEqual([
      "--kubeconfig",
      paths.kubeconfigPath,
      "debug",
      "--namespace",
      "default",
      "app",
      "--container=freelens-debug-123",
      "--image=alpine:latest",
      "--target=app",
      "--profile=netadmin",
      "--env=A=1",
      "--stdin",
      "--tty",
      "--attach=false",
      "--quiet",
    ]);
    expect(options.env.FREELENS_PROXY_TOKEN).toBe("test-token");
    expect(options.env.KUBECACHEDIR).toBe(paths.cacheDirectoryPath);
    expect(open).toHaveBeenCalledOnce();
  });

  it("attaches to the container a restored tab created before", async () => {
    getPod.mockResolvedValue(debugTestPod({ running: { startedAt: "now" } }));

    await openShell();

    expect(execFile).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledOnce();
  });

  it("waits for the container to start", async () => {
    getPod
      .mockResolvedValueOnce(debugTestPod({ waiting: { reason: "ContainerCreating", message: "" } }))
      .mockResolvedValueOnce(debugTestPod({ running: { startedAt: "now" } }));

    await openShell();

    expect(getPod).toHaveBeenCalledTimes(2);
    expect(socket.send).toHaveBeenCalledWith(expect.stringContaining("ContainerCreating"));
    expect(open).toHaveBeenCalledOnce();
  });

  it("passes a custom container spec in a file it removes afterwards", async () => {
    getPod.mockResolvedValueOnce(debugTestPod()).mockResolvedValueOnce(debugTestPod({ running: { startedAt: "now" } }));

    await openShell({ ...debugSpec, custom: "securityContext:\n  privileged: true" });

    const customFile = "/test-tmp/freelens-debug-123.custom.yaml";

    expect(writeFile).toHaveBeenCalledWith(customFile, "securityContext:\n  privileged: true", { mode: 0o600 });
    expect(execFile.mock.calls[0][1]).toContain(`--custom=${customFile}`);
    expect(unlink).toHaveBeenCalledWith(customFile);
  });

  it("reports the error of kubectl debug and removes the custom file", async () => {
    getPod.mockResolvedValue(debugTestPod());
    execFile.mockResolvedValue({
      callWasSuccessful: false,
      error: { stderr: "error: ephemeral containers are disabled\n", message: "failed" },
    });

    await expect(openShell({ ...debugSpec, custom: "{}" })).rejects.toThrow("ephemeral containers are disabled");
    expect(unlink).toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("does not create another container when the one it added has exited", async () => {
    getPod.mockResolvedValue(
      debugTestPod({ terminated: { exitCode: 0, reason: "Completed", startedAt: "then", finishedAt: "now" } }),
    );

    await expect(openShell()).rejects.toThrow("has exited (Completed)");
    expect(execFile).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("does not debug a pod that replaced the one the tab was opened for", async () => {
    getPod.mockResolvedValue(debugTestPod(undefined, { uid: "other-uid" }));

    await expect(openShell()).rejects.toThrow("was deleted or replaced");
    expect(execFile).not.toHaveBeenCalled();
  });

  it.each(["proxy", "tools", "pod"])("stops when the terminal closes at the %s stage", async (stage) => {
    getPod.mockResolvedValue(debugTestPod());
    const close = <T>(value: T) => {
      events.emit("close");
      return value;
    };

    if (stage === "proxy") ensurePaths.mockImplementation(async () => close(paths));
    if (stage === "tools") resolveTools.mockImplementation(async () => close(tools));
    if (stage === "pod") getPod.mockImplementation(async () => close(debugTestPod()));

    await openShell();

    expect(execFile).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
