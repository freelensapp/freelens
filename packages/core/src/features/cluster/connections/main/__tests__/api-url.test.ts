/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cluster } from "../../../../../common/cluster/cluster";
import readFileInjectable from "../../../../../common/fs/read-file.injectable";
import statInjectable from "../../../../../common/fs/stat.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import clusterApiUrlInjectable from "../api-url.injectable";
import type { Stats } from "node:fs";

import type { Mock } from "vitest";

const kubeConfigWithServer = (server: string) => `
apiVersion: v1
kind: Config
clusters:
  - name: some-cluster
    cluster:
      server: ${server}
contexts:
  - name: some-context-name
    context:
      cluster: some-cluster
      user: some-user
current-context: some-context-name
users:
  - name: some-user
    user:
      token: some-token
`;

describe("clusterApiUrl", () => {
  let clusterApiUrl: () => Promise<URL>;
  let readFileMock: Mock<(filePath: string) => Promise<string>>;
  let kubeConfig: string;
  let mtimeMs: number;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    kubeConfig = kubeConfigWithServer("https://old.example.test:6443");
    mtimeMs = 1000;
    readFileMock = vi.fn(async () => kubeConfig);

    di.override(readFileInjectable, () => readFileMock);
    di.override(statInjectable, () => async () => ({ mtimeMs }) as Stats);

    const cluster = new Cluster({
      id: "some-cluster-id",
      kubeConfigPath: "/some/kube-config",
      contextName: "some-context-name",
    });

    clusterApiUrl = di.inject(clusterApiUrlInjectable, cluster);
  });

  it("returns the server of the kubeconfig", async () => {
    expect((await clusterApiUrl()).toString()).toBe("https://old.example.test:6443/");
  });

  it("does not read the kubeconfig again while it is unchanged", async () => {
    await clusterApiUrl();
    const url = await clusterApiUrl();

    expect(url.toString()).toBe("https://old.example.test:6443/");
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it("reads the kubeconfig again once it is newer than what was read", async () => {
    await clusterApiUrl();

    kubeConfig = kubeConfigWithServer("https://new.example.test:6443");
    mtimeMs = 2000;

    const url = await clusterApiUrl();

    expect(url.toString()).toBe("https://new.example.test:6443/");
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });
});
