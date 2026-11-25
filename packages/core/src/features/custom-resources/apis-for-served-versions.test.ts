/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition, KubeObject } from "@freelensapp/kube-object";
import { beforeEach, describe, expect, it } from "vitest";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";

import type { CustomResourceDefinitionVersion } from "@freelensapp/kube-object";

import type { ApiManager } from "../../common/k8s-api/api-manager";
import type { CustomResourceDefinitionStore } from "../../renderer/components/custom-resource-definitions/store";

describe("APIs of the versions of a custom resource definition", () => {
  let apiManager: ApiManager;
  let customResourceDefinitionStore: CustomResourceDefinitionStore;

  const setVersions = (versions: CustomResourceDefinitionVersion[]) => {
    customResourceDefinitionStore.items.replace([
      new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "examples.example.freelens.app",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/examples.example.freelens.app",
          uid: "some-uid",
          resourceVersion: "1",
        },
        spec: {
          group: "example.freelens.app",
          scope: "Namespaced",
          names: {
            kind: "Example",
            plural: "examples",
          },
          versions,
        },
      }),
    ]);
  };

  beforeEach(async () => {
    const builder = getApplicationBuilder();

    builder.setEnvironmentToClusterFrame();
    await builder.render();

    const windowDi = builder.applicationWindow.only.di;

    apiManager = windowDi.inject(apiManagerInjectable);
    customResourceDefinitionStore = windowDi.inject(customResourceDefinitionStoreInjectable);
  });

  describe("given two served versions and one that is not served", () => {
    beforeEach(() => {
      setVersions([
        { name: "v1alpha1", served: true, storage: false },
        { name: "v1alpha2", served: true, storage: true },
        { name: "v1beta1", served: false, storage: false },
      ]);
    });

    it.each(["v1alpha1", "v1alpha2"])("registers an API for the served version %s", (version) => {
      const api = apiManager.getApiByKind("Example", `example.freelens.app/${version}`);

      expect(api?.apiBase).toBe(`/apis/example.freelens.app/${version}/examples`);
      expect(api?.isNamespaced).toBe(true);
    });

    it("registers no API for the version that is not served", () => {
      expect(apiManager.getApiByKind("Example", "example.freelens.app/v1beta1")).toBeUndefined();
    });

    it("gives each served version its own store", () => {
      const alpha1Store = apiManager.getStore("/apis/example.freelens.app/v1alpha1/examples");
      const alpha2Store = apiManager.getStore("/apis/example.freelens.app/v1alpha2/examples");

      expect(alpha1Store?.api.apiBase).toBe("/apis/example.freelens.app/v1alpha1/examples");
      expect(alpha2Store?.api.apiBase).toBe("/apis/example.freelens.app/v1alpha2/examples");
    });

    it("finds the definition of an object of either served version", () => {
      const toExample = (version: string) =>
        new KubeObject({
          apiVersion: `example.freelens.app/${version}`,
          kind: "Example",
          metadata: {
            name: "some-example",
            namespace: "default",
            selfLink: `/apis/example.freelens.app/${version}/namespaces/default/examples/some-example`,
            uid: "some-example-uid",
            resourceVersion: "1",
          },
        });

      expect(customResourceDefinitionStore.getByObject(toExample("v1alpha1"))?.getName()).toBe(
        "examples.example.freelens.app",
      );
      expect(customResourceDefinitionStore.getByObject(toExample("v1alpha2"))?.getName()).toBe(
        "examples.example.freelens.app",
      );
      expect(customResourceDefinitionStore.getByObject(toExample("v1beta1"))).toBeUndefined();
    });

    describe("when a version stops being served", () => {
      beforeEach(() => {
        setVersions([
          { name: "v1alpha1", served: false, storage: false },
          { name: "v1alpha2", served: true, storage: true },
          { name: "v1beta1", served: false, storage: false },
        ]);
      });

      it("removes its API", () => {
        expect(apiManager.getApiByKind("Example", "example.freelens.app/v1alpha1")).toBeUndefined();
        expect(apiManager.getApiByKind("Example", "example.freelens.app/v1alpha2")).toBeDefined();
      });
    });
  });

  describe("given no served version", () => {
    beforeEach(() => {
      setVersions([
        { name: "v1alpha1", served: false, storage: false },
        { name: "v1alpha2", served: false, storage: true },
      ]);
    });

    it("registers an API for the storage version only, for the view to report it", () => {
      expect(apiManager.getApiByKind("Example", "example.freelens.app/v1alpha1")).toBeUndefined();
      expect(apiManager.getApiByKind("Example", "example.freelens.app/v1alpha2")?.apiBase).toBe(
        "/apis/example.freelens.app/v1alpha2/examples",
      );
    });
  });
});
