/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { clusterApiAddressInjectionToken } from "../../common/k8s-api/cluster-api-address-injection-token";
import createKubeApiForClusterInjectable from "../../common/k8s-api/create-kube-api-for-cluster.injectable";
import createKubeJsonApiForClusterInjectable from "../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import lensProxyPortInjectable from "../lens-proxy/lens-proxy-port.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

describe("cluster-api-address in main", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = getDiForUnitTesting();
  });

  // The lens-proxy port is unset until the proxy listens, and
  // `setupLensProxyInjectable` builds the proxy before that happens. Building it
  // reaches this injectable — lens-proxy is constructed with the shell api
  // request, which pulls in `createKubeJsonApiForCluster` — so resolving the
  // address at instantiation time kills the main process at startup, long
  // before any cluster is asked for. The integration suite reports that as a
  // ten-minute timeout, because Playwright never gets an app at all.
  describe("before lens-proxy has a port", () => {
    it("can be instantiated", () => {
      expect(() => di.inject(clusterApiAddressInjectionToken)).not.toThrow();
    });

    it("can be instantiated through the factories startup reaches", () => {
      expect(() => di.inject(createKubeJsonApiForClusterInjectable)).not.toThrow();
      expect(() => di.inject(createKubeApiForClusterInjectable)).not.toThrow();
    });

    it("reads the port lazily, so an instance made before listening still works", () => {
      const clusterApiAddress = di.inject(clusterApiAddressInjectionToken);

      di.inject(lensProxyPortInjectable).set(54321);

      expect(clusterApiAddress("some-cluster-id").serverAddress).toBe("https://127.0.0.1:54321");
    });
  });

  it("addresses lens-proxy directly and names the cluster in a Host header", () => {
    di.inject(lensProxyPortInjectable).set(12345);

    expect(di.inject(clusterApiAddressInjectionToken)("some-cluster-id")).toEqual({
      serverAddress: "https://127.0.0.1:12345",
      hostHeader: "some-cluster-id.renderer.freelens.app:12345",
    });
  });
});
