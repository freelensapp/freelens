/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Deployment, KubeObject, Pod } from "@freelensapp/kube-object";
import { computed } from "mobx";
import { describe, expect, it } from "vitest";
import { LensExtensionKubeObject } from "../common-api/k8s-api";
import * as extensions from "../extension-api";
import { detailsFor, menuItemFor } from "../renderer-api/kube-object-registrations";

import type { KubeObjectDetailsProps } from "../../renderer/components/kube-object-details/kube-object-details";
import type { KubeObjectMenuItemProps } from "../../renderer/components/kube-object-menu/kube-object-menu-registration";

class Example extends LensExtensionKubeObject<any, unknown, { replicas: number }> {
  static readonly kind = "Example";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/example.com/v1/examples";
  static readonly crd = {
    apiVersions: ["example.com/v1", "example.com/v1beta1"],
    plural: "examples",
    singular: "example",
  };
}

class WithoutKind extends KubeObject {
  static readonly apiBase = "/apis/example.com/v1/withoutkinds";
}

class WithoutApiVersions extends KubeObject {
  static readonly kind = "WithoutApiVersions";
}

class WithUnparseableApiBase extends KubeObject {
  static readonly kind = "WithUnparseableApiBase";
  static readonly apiBase = "not-a-kube-api-path";
}

class WithEmptyCrd extends LensExtensionKubeObject {
  static readonly kind = "WithEmptyCrd";
  static readonly crd = { apiVersions: [], plural: "withemptycrds", singular: "withemptycrd" };
}

const PodDetails = (_props: KubeObjectDetailsProps<Pod>) => null;
const DeploymentDetails = (_props: KubeObjectDetailsProps<Deployment>) => null;
const ExampleDetails = (_props: KubeObjectDetailsProps<Example>) => null;
const AnyDetails = (_props: KubeObjectDetailsProps<KubeObject>) => null;
const PodMenuItem = (_props: KubeObjectMenuItemProps<Pod>) => null;
const DeploymentMenuItem = (_props: KubeObjectMenuItemProps<Deployment>) => null;
const ExampleMenuItem = (_props: KubeObjectMenuItemProps<Example>) => null;
const AnyMenuItem = (_props: KubeObjectMenuItemProps<KubeObject>) => null;

describe("Renderer.K8sApi registration helpers", () => {
  it("are reachable through the Renderer namespace", () => {
    expect(extensions.Renderer.K8sApi.detailsFor).toBe(detailsFor);
    expect(extensions.Renderer.K8sApi.menuItemFor).toBe(menuItemFor);
  });

  describe("detailsFor", () => {
    it("derives kind and apiVersions from the apiBase of a core-group class", () => {
      expect(detailsFor(Pod, { Details: PodDetails })).toEqual({
        kind: "Pod",
        apiVersions: ["v1"],
        components: { Details: PodDetails },
      });
    });

    it("derives kind and apiVersions from the apiBase of a named-group class", () => {
      expect(detailsFor(Deployment, { Details: DeploymentDetails })).toEqual({
        kind: "Deployment",
        apiVersions: ["apps/v1"],
        components: { Details: DeploymentDetails },
      });
    });

    it("takes apiVersions from the crd of a LensExtensionKubeObject subclass", () => {
      expect(detailsFor(Example, { Details: ExampleDetails }).apiVersions).toEqual([
        "example.com/v1",
        "example.com/v1beta1",
      ]);
    });

    it("prefers explicit apiVersions over the crd and the apiBase", () => {
      expect(detailsFor(Example, { Details: ExampleDetails, apiVersions: ["example.com/v2"] }).apiVersions).toEqual([
        "example.com/v2",
      ]);
      expect(
        detailsFor(Deployment, { Details: DeploymentDetails, apiVersions: ["apps/v1", "extensions/v1beta1"] })
          .apiVersions,
      ).toEqual(["apps/v1", "extensions/v1beta1"]);
    });

    it("returns a copy of the apiVersions it was given", () => {
      const crdApiVersions = Example.crd.apiVersions;
      const registration = detailsFor(Example, { Details: ExampleDetails });

      registration.apiVersions.push("example.com/v2");

      expect(crdApiVersions).toEqual(["example.com/v1", "example.com/v1beta1"]);
    });

    it("passes priority and visible through", () => {
      const visible = computed(() => true);

      expect(detailsFor(Pod, { Details: PodDetails, priority: 10, visible })).toEqual({
        kind: "Pod",
        apiVersions: ["v1"],
        components: { Details: PodDetails },
        priority: 10,
        visible,
      });
    });

    it("throws for a class without kind", () => {
      expect(() => detailsFor(WithoutKind, { Details: AnyDetails })).toThrow(
        'detailsFor(WithoutKind): the class has no static "kind"',
      );
    });

    it("throws for a class without any source of apiVersions", () => {
      expect(() => detailsFor(WithoutApiVersions, { Details: AnyDetails })).toThrow(
        'detailsFor(WithoutApiVersions): no "apiVersions" given',
      );
      expect(() => detailsFor(WithUnparseableApiBase, { Details: AnyDetails })).toThrow(
        'detailsFor(WithUnparseableApiBase): no "apiVersions" given',
      );
    });

    it("throws for empty apiVersions", () => {
      expect(() => detailsFor(Pod, { Details: PodDetails, apiVersions: [] })).toThrow(
        'detailsFor(Pod): "apiVersions" is empty',
      );
      expect(() => detailsFor(WithEmptyCrd, { Details: AnyDetails })).toThrow(
        'detailsFor(WithEmptyCrd): "crd.apiVersions" is empty',
      );
    });
  });

  describe("menuItemFor", () => {
    it("derives kind and apiVersions from the apiBase of a core-group class", () => {
      expect(menuItemFor(Pod, { MenuItem: PodMenuItem })).toEqual({
        kind: "Pod",
        apiVersions: ["v1"],
        components: { MenuItem: PodMenuItem },
      });
    });

    it("derives kind and apiVersions from the apiBase of a named-group class", () => {
      expect(menuItemFor(Deployment, { MenuItem: DeploymentMenuItem })).toEqual({
        kind: "Deployment",
        apiVersions: ["apps/v1"],
        components: { MenuItem: DeploymentMenuItem },
      });
    });

    it("takes apiVersions from the crd of a LensExtensionKubeObject subclass", () => {
      expect(menuItemFor(Example, { MenuItem: ExampleMenuItem }).apiVersions).toEqual([
        "example.com/v1",
        "example.com/v1beta1",
      ]);
    });

    it("prefers explicit apiVersions over the crd", () => {
      expect(menuItemFor(Example, { MenuItem: ExampleMenuItem, apiVersions: ["example.com/v2"] }).apiVersions).toEqual([
        "example.com/v2",
      ]);
    });

    it("passes visible through", () => {
      const visible = computed(() => false);

      expect(menuItemFor(Pod, { MenuItem: PodMenuItem, visible })).toEqual({
        kind: "Pod",
        apiVersions: ["v1"],
        components: { MenuItem: PodMenuItem },
        visible,
      });
    });

    it("throws for a class without kind", () => {
      expect(() => menuItemFor(WithoutKind, { MenuItem: AnyMenuItem })).toThrow(
        'menuItemFor(WithoutKind): the class has no static "kind"',
      );
    });

    it("throws for a class without any source of apiVersions", () => {
      expect(() => menuItemFor(WithoutApiVersions, { MenuItem: AnyMenuItem })).toThrow(
        'menuItemFor(WithoutApiVersions): no "apiVersions" given',
      );
    });
  });
});
