/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import directoryForTempInjectable from "../../common/app-paths/directory-for-temp/directory-for-temp.injectable";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import getClusterByIdInjectable from "../../features/cluster/storage/common/get-by-id.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import getClusterForRequestInjectable from "./get-cluster-for-request.injectable";

import type { Cluster } from "../../common/cluster/cluster";
import type { GetClusterForRequest, ServerRequest } from "./freelens-proxy";

describe("getting the cluster of a Freelens proxy request", () => {
  let getClusterForRequest: GetClusterForRequest;
  const cluster = { id: "some-cluster-id" } as Cluster;

  const requestWith = (url: string, headers: Record<string, string>) => ({ url, headers }) as ServerRequest;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(directoryForTempInjectable, () => "/some-directory-for-tmp");
    di.override(getClusterByIdInjectable, () => (id) => (id === cluster.id ? cluster : undefined));

    getClusterForRequest = di.inject(getClusterForRequestInjectable);
  });

  it("finds the cluster of an HTTP/1.1 request from its host", () => {
    const req = requestWith("/api-kube/api/v1/pods", { host: "some-cluster-id.renderer.freelens.app:12345" });

    expect(getClusterForRequest(req)).toBe(cluster);
  });

  it("finds the cluster of an HTTP/2 request from its authority, which comes without a host", () => {
    const req = requestWith("/api-kube/api/v1/pods", {
      ":authority": "some-cluster-id.renderer.freelens.app:12345",
    });

    expect(getClusterForRequest(req)).toBe(cluster);
  });

  it("finds no cluster for the frame of the application", () => {
    const req = requestWith("/api-kube/api/v1/pods", { ":authority": "renderer.freelens.app:12345" });

    expect(getClusterForRequest(req)).toBeUndefined();
  });

  it("finds no cluster for a request without an authority or a host", () => {
    expect(getClusterForRequest(requestWith("/api-kube/api/v1/pods", {}))).toBeUndefined();
  });

  it("finds the cluster of an HTTP/2 request to the loopback address from its path, and points it at the kube api", () => {
    const req = requestWith("/some-cluster-id/api/v1/pods", { ":authority": "127.0.0.1:12345" });

    expect(getClusterForRequest(req)).toBe(cluster);
    expect(req.url).toBe("/api-kube/api/v1/pods");
  });
});
