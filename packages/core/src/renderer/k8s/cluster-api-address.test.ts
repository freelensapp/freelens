/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterApiAddressInjectionToken } from "../../common/k8s-api/cluster-api-address-injection-token";
import windowLocationInjectable from "../../common/k8s-api/window-location.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";

import type { DiContainer } from "@ogre-tools/injectable";

describe("cluster-api-address in the renderer", () => {
  let di: DiContainer;

  const addressFor = (frameHost: string, clusterId: string) => {
    di = getDiForUnitTesting();
    di.override(windowLocationInjectable, () => ({ host: frameHost }));

    return di.inject(clusterApiAddressInjectionToken)(clusterId);
  };

  // lens-proxy routes on the request's host, and Chromium drops a `Host`
  // header, so the cluster has to be named in the URL. Getting this wrong does
  // not fail loudly: the request lands on the frame's own origin and silently
  // answers for the wrong cluster.
  it("addresses the cluster in the URL, from the root frame", () => {
    expect(addressFor("renderer.freelens.app:12345", "some-cluster-id")).toEqual({
      serverAddress: "https://some-cluster-id.renderer.freelens.app:12345",
    });
  });

  it("addresses another cluster from inside a cluster frame", () => {
    expect(addressFor("current-cluster-id.renderer.freelens.app:12345", "other-cluster-id")).toEqual({
      serverAddress: "https://other-cluster-id.renderer.freelens.app:12345",
    });
  });

  it("sets no Host header, which Chromium would refuse to send", () => {
    expect(addressFor("renderer.freelens.app:12345", "some-cluster-id").hostHeader).toBeUndefined();
  });
});
