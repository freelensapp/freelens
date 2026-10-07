/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../common/cluster/cluster";
import { ResourceApplier } from "./resource-applier";

import type { Logger } from "@freelensapp/logger";

import type { ExecFile } from "../../common/fs/exec-file.injectable";
import type { KubeconfigManager } from "../kubeconfig-manager/kubeconfig-manager";
import type { Kubectl } from "../kubectl/kubectl";

const kubeconfigPath = "/some-directory-for-temp/kubeconfig-some-cluster-id";
const cacheDirectoryPath = "/some-directory-for-temp/kubecache-some-cluster-id";

describe("ResourceApplier", () => {
  let execFileMock: ReturnType<typeof vi.fn>;
  let resourceApplier: ResourceApplier;

  beforeEach(() => {
    execFileMock = vi.fn(async () => ({ callWasSuccessful: true, response: "{}" }));

    const cluster = new Cluster({
      id: "some-cluster-id",
      contextName: "some-context",
      kubeConfigPath: "/some-kubeconfig",
      preferences: { httpsProxy: "http://some-https-proxy:3128" },
    });
    const kubectl = {
      ensureKubectl: async () => true,
      getPath: async () => "/some-kubectl",
    } as Partial<Kubectl> as Kubectl;
    const proxyKubeconfigManager = {
      ensurePaths: async () => ({ kubeconfigPath, cacheDirectoryPath }),
    } as Partial<KubeconfigManager> as KubeconfigManager;

    resourceApplier = new ResourceApplier(
      {
        emitAppEvent: vi.fn(),
        writeFile: vi.fn(async () => {}),
        deleteFile: vi.fn(async () => {}),
        execFile: execFileMock as unknown as ExecFile,
        joinPaths: (...paths) => paths.join("/"),
        createKubectl: () => kubectl,
        proxyKubeconfigManager,
        logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), silly: vi.fn(), warn: vi.fn() } as Logger,
      },
      cluster,
    );
  });

  const withKubeCacheDir = () => expect.objectContaining({ KUBECACHEDIR: cacheDirectoryPath });

  it("patches with the proxy kubeconfig and its cache directory", async () => {
    await resourceApplier.patch("some-pod", "Pod", [], "some-namespace");

    expect(execFileMock).toHaveBeenCalledWith(
      "/some-kubectl",
      [
        "--kubeconfig",
        kubeconfigPath,
        "--cache-dir",
        cacheDirectoryPath,
        "patch",
        "Pod",
        "some-pod",
        "--namespace",
        "some-namespace",
        "--type",
        "json",
        "--patch",
        "[]",
        "-o",
        "json",
      ],
      { env: withKubeCacheDir() },
    );
  });

  it("applies with the proxy kubeconfig, its cache directory and the cluster's HTTPS proxy", async () => {
    await resourceApplier.create("apiVersion: v1\nkind: Pod\nmetadata:\n  name: some-pod\n");

    expect(execFileMock).toHaveBeenCalledWith(
      "/some-kubectl",
      [
        "apply",
        "--kubeconfig",
        kubeconfigPath,
        "--cache-dir",
        cacheDirectoryPath,
        "-o",
        "json",
        "-f",
        expect.any(String),
      ],
      {
        env: expect.objectContaining({
          KUBECACHEDIR: cacheDirectoryPath,
          HTTPS_PROXY: "http://some-https-proxy:3128",
        }),
      },
    );
  });

  it.each([
    ["apply", (applier: ResourceApplier) => applier.kubectlApplyAll(["some-resource"])],
    ["delete", (applier: ResourceApplier) => applier.kubectlDeleteAll(["some-resource"])],
  ])("runs %s on a directory with the proxy kubeconfig and its cache directory", async (subCommand, run) => {
    await run(resourceApplier);

    expect(execFileMock).toHaveBeenCalledWith("/some-kubectl", expect.any(Array), { env: withKubeCacheDir() });

    const [, args] = execFileMock.mock.calls[0] as [string, string[]];

    expect(args.slice(0, 5)).toEqual([subCommand, "--kubeconfig", kubeconfigPath, "--cache-dir", cacheDirectoryPath]);
  });
});
