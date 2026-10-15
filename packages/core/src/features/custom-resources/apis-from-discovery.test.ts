/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { customResourceDefinitionApiInjectionToken } from "../../common/k8s-api/api-manager/crd-api-token";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import hostedClusterInjectable from "../../renderer/cluster-frame-context/hosted-cluster.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ApiManager } from "../../common/k8s-api/api-manager";
import type { KubeApiResource } from "../../common/rbac";
import type { CustomResourceDefinitionStore } from "../../renderer/components/custom-resource-definitions/store";

const v1ApiBase = "/apis/gateway.networking.k8s.io/v1/httproutes";
const v1beta1ApiBase = "/apis/gateway.networking.k8s.io/v1beta1/httproutes";

// What discovery reports: a custom resource in two served versions, with a
// subresource, next to resources of the groups Kubernetes defines itself.
const discoveredResources: KubeApiResource[] = [
  { group: "", version: "v1", apiName: "pods", kind: "Pod", namespaced: true },
  { group: "apps", version: "v1", apiName: "deployments", kind: "Deployment", namespaced: true },
  {
    group: "certificates.k8s.io",
    version: "v1",
    apiName: "certificatesigningrequests",
    kind: "CertificateSigningRequest",
    namespaced: false,
  },
  { group: "gateway.networking.k8s.io", version: "v1", apiName: "httproutes", kind: "HTTPRoute", namespaced: true },
  {
    group: "gateway.networking.k8s.io",
    version: "v1",
    apiName: "httproutes/status",
    kind: "HTTPRoute",
    namespaced: true,
  },
  {
    group: "gateway.networking.k8s.io",
    version: "v1beta1",
    apiName: "httproutes",
    kind: "HTTPRoute",
    namespaced: true,
  },
];

describe("APIs of custom resources from the discovery of the cluster", () => {
  let windowDi: DiContainer;
  let apiManager: ApiManager;
  let customResourceDefinitionStore: CustomResourceDefinitionStore;

  const getCustomResourceApiBases = () =>
    windowDi
      .injectMany(customResourceDefinitionApiInjectionToken)
      .map((api) => api.apiBase)
      .sort();

  beforeEach(async () => {
    const builder = getApplicationBuilder();

    builder.setEnvironmentToClusterFrame();
    await builder.render();

    windowDi = builder.applicationWindow.only.di;
    apiManager = windowDi.inject(apiManagerInjectable);
    customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);

    const hostedCluster = windowDi.inject(hostedClusterInjectable);

    if (!hostedCluster) {
      throw new Error("Expected a hosted cluster in the cluster frame");
    }

    hostedCluster.knownResources.replace(discoveredResources);
  });

  describe("when the list of definitions is refused", () => {
    beforeEach(async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(customResourceDefinitionStore.api, "list").mockRejectedValue(
        new Error("customresourcedefinitions.apiextensions.k8s.io is forbidden"),
      );

      await customResourceDefinitionStore.loadAll();
    });

    it("has failed loading the definitions", () => {
      expect(customResourceDefinitionStore.failedLoading).toBe(true);
    });

    it.each([v1ApiBase, v1beta1ApiBase])("registers an API for the served version %s", (apiBase) => {
      const api = apiManager.getApi(apiBase);

      expect(api?.apiBase).toBe(apiBase);
      expect(api?.kind).toBe("HTTPRoute");
      expect(api?.isNamespaced).toBe(true);
    });

    it.each([v1ApiBase, v1beta1ApiBase])("gives the API of %s a store", (apiBase) => {
      expect(apiManager.getStore(apiBase)?.api.apiBase).toBe(apiBase);
    });

    it("registers no API for a subresource or a resource of a group Kubernetes defines", () => {
      expect(getCustomResourceApiBases()).toEqual([v1ApiBase, v1beta1ApiBase]);
    });

    describe("when the list of definitions succeeds again, without definitions", () => {
      beforeEach(async () => {
        vi.mocked(customResourceDefinitionStore.api.list).mockResolvedValue([]);

        await customResourceDefinitionStore.loadAll();
      });

      it("removes the APIs created from discovery", () => {
        expect(getCustomResourceApiBases()).toEqual([]);
      });
    });
  });

  describe("when the list of definitions is empty", () => {
    beforeEach(async () => {
      vi.spyOn(customResourceDefinitionStore.api, "list").mockResolvedValue([]);

      await customResourceDefinitionStore.loadAll();
    });

    it("has loaded the definitions", () => {
      expect(customResourceDefinitionStore.isLoaded).toBe(true);
      expect(customResourceDefinitionStore.failedLoading).toBe(false);
    });

    it("registers no API from discovery", () => {
      expect(getCustomResourceApiBases()).toEqual([]);
      expect(apiManager.getApi(v1ApiBase)).toBeUndefined();
    });
  });
});
