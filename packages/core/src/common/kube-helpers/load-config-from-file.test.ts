/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { Cluster } from "../cluster/cluster";
import writeBufferSyncInjectable from "../fs/write-buffer-sync.injectable";
import loadConfigFromFileInjectable from "./load-config-from-file.injectable";
import loadValidatedClusterConfigInjectable from "./load-validated-config-from-file.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

const kubeconfig = `apiVersion: v1
kind: Config
clusters:
  - name: some-cluster
    cluster:
      server: https://some.example.test:6443
contexts:
  - name: some-context
    context:
      cluster: some-cluster
      user: some-user
current-context: some-context
users:
  - name: some-user
    user:
      token: some-token
`;

// Windows PowerShell 5.1 writes UTF-16 LE with a byte order mark and CRLF line endings
const kubeconfigWithCrlf = kubeconfig.replaceAll("\n", "\r\n");

describe.each([
  ["UTF-8", Buffer.from(kubeconfig, "utf-8")],
  ["UTF-8 with a byte order mark", Buffer.from(`\uFEFF${kubeconfig}`, "utf-8")],
  ["UTF-8 with CRLF line endings", Buffer.from(kubeconfigWithCrlf, "utf-8")],
  ["UTF-16 LE with a byte order mark", Buffer.from(`\uFEFF${kubeconfig}`, "utf16le")],
  ["UTF-16 LE with a byte order mark and CRLF line endings", Buffer.from(`\uFEFF${kubeconfigWithCrlf}`, "utf16le")],
  ["UTF-16 BE with a byte order mark", Buffer.from(`\uFEFF${kubeconfig}`, "utf16le").swap16()],
])("given a kubeconfig file in %s", (_, contents) => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
    di.inject(writeBufferSyncInjectable)("/some/kubeconfig", contents);
  });

  it("loadConfigFromFile reads it", async () => {
    const { config, error } = await di.inject(loadConfigFromFileInjectable)("/some/kubeconfig");

    expect(error).toBeUndefined();
    expect(config.currentContext).toBe("some-context");
    expect(config.getCurrentCluster()?.server).toBe("https://some.example.test:6443");
  });

  it("loadValidatedClusterConfig reads it", async () => {
    const cluster = new Cluster({
      id: "some-cluster-id",
      kubeConfigPath: "/some/kubeconfig",
      contextName: "some-context",
    });
    const result = await di.inject(loadValidatedClusterConfigInjectable)(cluster);

    expect(result.error).toBeUndefined();
    expect(result.error ? undefined : result.cluster.server).toBe("https://some.example.test:6443");
  });
});
