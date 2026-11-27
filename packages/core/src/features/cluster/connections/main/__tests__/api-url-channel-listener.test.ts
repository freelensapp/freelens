/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { Cluster } from "../../../../../common/cluster/cluster";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import clustersStateInjectable from "../../../storage/common/state.injectable";
import clusterApiUrlInjectable from "../api-url.injectable";
import clusterApiUrlChannelListenerInjectable from "../api-url-channel-listener.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("cluster API URL channel listener", () => {
  let di: DiContainer;
  let apiUrl: () => Promise<URL>;

  const request = (clusterId: string) => di.inject(clusterApiUrlChannelListenerInjectable).handler(clusterId);

  beforeEach(() => {
    di = getDiForUnitTesting();
    apiUrl = async () => new URL("https://api.example.test:6443");

    di.override(clusterApiUrlInjectable, () => () => apiUrl());
    di.inject(clustersStateInjectable).set(
      "some-cluster-id",
      new Cluster({ id: "some-cluster-id", contextName: "some-context", kubeConfigPath: "/some/kubeconfig" }),
    );
  });

  it("answers with the server of the cluster's kubeconfig", async () => {
    expect(await request("some-cluster-id")).toBe("https://api.example.test:6443");
  });

  it("keeps the path of the server", async () => {
    apiUrl = async () => new URL("https://rancher.example.test/k8s/clusters/c-m-abc/");

    expect(await request("some-cluster-id")).toBe("https://rancher.example.test/k8s/clusters/c-m-abc/");
  });

  it("leaves out the credentials of the server's URL", async () => {
    apiUrl = async () => new URL("https://admin:secret@api.example.test:6443");

    expect(await request("some-cluster-id")).toBe("https://api.example.test:6443");
  });

  it("answers with nothing when the kubeconfig cannot be read", async () => {
    apiUrl = async () => {
      throw new Error("no such file");
    };

    expect(await request("some-cluster-id")).toBeUndefined();
  });

  it("answers with nothing for an unknown cluster", async () => {
    expect(await request("some-other-cluster-id")).toBeUndefined();
  });
});
