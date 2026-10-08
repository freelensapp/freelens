/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { CustomResourceDefinition } from "@freelensapp/kube-object";
import { describe, expect, it } from "vitest";

import type { CustomResourceDefinitionSpec, CustomResourceDefinitionVersion } from "@freelensapp/kube-object";

describe("Crds", () => {
  describe("getVersion()", () => {
    it("should throw if none of the versions are served", () => {
      const crd = new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "foo",
          resourceVersion: "12345",
          uid: "12345",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/foo",
        },
        spec: {
          group: "foo.bar",
          names: {
            kind: "Foo",
            plural: "foos",
          },
          scope: "Namespaced",
          versions: [
            {
              name: "123",
              served: false,
              storage: false,
            },
            {
              name: "1234",
              served: false,
              storage: false,
            },
          ],
        },
      });

      expect(() => crd.getVersion()).toThrowError("Failed to find a version for CustomResourceDefinition foo");
    });

    it("should get the version that is both served and stored", () => {
      const crd = new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "foo",
          resourceVersion: "12345",
          uid: "12345",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/foo",
        },
        spec: {
          group: "foo.bar",
          names: {
            kind: "Foo",
            plural: "foos",
          },
          scope: "Namespaced",
          versions: [
            {
              name: "123",
              served: true,
              storage: true,
            },
            {
              name: "1234",
              served: false,
              storage: false,
            },
          ],
        },
      });

      expect(crd.getVersion()).toBe("123");
    });

    it("should get the version that is only stored", () => {
      const crd = new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "foo",
          resourceVersion: "12345",
          uid: "12345",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/foo",
        },
        spec: {
          group: "foo.bar",
          names: {
            kind: "Foo",
            plural: "foos",
          },
          scope: "Namespaced",
          versions: [
            {
              name: "123",
              served: false,
              storage: true,
            },
            {
              name: "1234",
              served: false,
              storage: false,
            },
          ],
        },
      });

      expect(crd.getVersion()).toBe("123");
    });

    it("should get the version that is both served and stored even with version field", () => {
      const crd = new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "foo",
          resourceVersion: "12345",
          uid: "12345",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/foo",
        },
        spec: {
          group: "foo.bar",
          names: {
            kind: "Foo",
            plural: "foos",
          },
          scope: "Namespaced",
          version: "abc",
          versions: [
            {
              name: "123",
              served: true,
              storage: true,
            },
            {
              name: "1234",
              served: false,
              storage: false,
            },
          ],
        },
      });

      expect(crd.getVersion()).toBe("123");
    });

    it("should get the version name from the version field, ignoring versions on v1beta", () => {
      const crd = new CustomResourceDefinition({
        apiVersion: "apiextensions.k8s.io/v1beta1",
        kind: "CustomResourceDefinition",
        metadata: {
          name: "foo",
          resourceVersion: "12345",
          uid: "12345",
          selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/foo",
        },
        spec: {
          version: "abc",
          versions: [
            {
              name: "foobar",
              served: true,
              storage: true,
            },
          ],
        } as CustomResourceDefinitionSpec,
      });

      expect(crd.getVersion()).toBe("abc");
    });

    it("should get the storage version when it is served, over a served version of higher priority", () => {
      const crd = crdWithVersions([
        { name: "v1", served: true, storage: false },
        { name: "v1beta1", served: true, storage: true },
      ]);

      expect(crd.getVersion()).toBe("v1beta1");
    });

    it("should get a served version when the storage version is not served", () => {
      const crd = crdWithVersions([
        { name: "v1alpha1", served: true, storage: false },
        { name: "v1alpha2", served: false, storage: true },
      ]);

      expect(crd.getVersion()).toBe("v1alpha1");
      expect(crd.getResourceApiBase()).toBe("/apis/example.freelens.app/v1alpha1/examples");
    });

    it("should get the served version of highest priority when the storage version is not served", () => {
      const crd = crdWithVersions([
        { name: "v1alpha1", served: true, storage: false },
        { name: "foo", served: true, storage: false },
        { name: "v1beta1", served: true, storage: false },
        { name: "v2alpha1", served: true, storage: false },
        { name: "v1", served: false, storage: true },
      ]);

      expect(crd.getVersion()).toBe("v1beta1");
    });

    it("should get the storage version when no version is served", () => {
      const crd = crdWithVersions([
        { name: "v1alpha1", served: false, storage: false },
        { name: "v1alpha2", served: false, storage: true },
      ]);

      expect(crd.getPreferredVersion()).toEqual({ name: "v1alpha2", served: false, storage: true });
    });
  });

  describe("getServedVersions()", () => {
    it("should order the served versions by Kubernetes version priority", () => {
      const names = ["foo10", "v11alpha2", "v1", "v10beta3", "foo1", "v2", "v12alpha1", "v3beta1", "v10", "v11beta2"];
      const crd = crdWithVersions([
        ...names.map((name) => ({ name, served: true, storage: name === "v1" })),
        { name: "v20", served: false, storage: false },
      ]);

      expect(crd.getServedVersions().map((version) => version.name)).toEqual([
        "v10",
        "v2",
        "v1",
        "v11beta2",
        "v10beta3",
        "v3beta1",
        "v12alpha1",
        "v11alpha2",
        "foo1",
        "foo10",
      ]);
    });
  });

  describe("getPrinterColumns() and getValidation()", () => {
    it("should describe the served version when the storage version is not served", () => {
      const crd = crdWithVersions([
        {
          name: "v1alpha1",
          served: true,
          storage: false,
          schema: { openAPIV3Schema: { description: "served" } },
          additionalPrinterColumns: [{ name: "Served", type: "string", jsonPath: ".spec.served" }],
        },
        {
          name: "v1alpha2",
          served: false,
          storage: true,
          schema: { openAPIV3Schema: { description: "stored" } },
          additionalPrinterColumns: [{ name: "Stored", type: "string", jsonPath: ".spec.stored" }],
        },
      ]);

      expect(crd.getPrinterColumns().map((column) => column.name)).toEqual(["Served"]);
      expect(JSON.parse(crd.getValidation())).toEqual({ openAPIV3Schema: { description: "served" } });
    });
  });
});

const crdWithVersions = (versions: CustomResourceDefinitionVersion[]) =>
  new CustomResourceDefinition({
    apiVersion: "apiextensions.k8s.io/v1",
    kind: "CustomResourceDefinition",
    metadata: {
      name: "examples.example.freelens.app",
      resourceVersion: "12345",
      uid: "12345",
      selfLink: "/apis/apiextensions.k8s.io/v1/customresourcedefinitions/examples.example.freelens.app",
    },
    spec: {
      group: "example.freelens.app",
      names: {
        kind: "Example",
        plural: "examples",
      },
      scope: "Namespaced",
      versions,
    },
  });
