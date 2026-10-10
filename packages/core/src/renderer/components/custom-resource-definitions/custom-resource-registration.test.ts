/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeObject } from "@freelensapp/kube-object";
import { describe, expect, it } from "vitest";
import { LensExtensionKubeObject } from "../../../extensions/common-api/k8s-api";
import {
  describeCustomResourceRegistration,
  describeCustomResourcesField,
  getCustomResourcesOfRegistration,
} from "./custom-resource-registration";

import type { CustomResourceRegistration } from "./custom-resource-registration";

class Example extends LensExtensionKubeObject {
  static readonly kind = "Example";
  static readonly crd = {
    apiVersions: ["example.freelens.app/v1alpha1", "example.freelens.app/v1"],
    plural: "examples",
    singular: "example",
  };
}

class ExampleFromApiBase extends KubeObject {
  static readonly kind = "Example";
  static readonly apiBase = "/apis/example.freelens.app/v1/examples";
}

describe("getCustomResourcesOfRegistration", () => {
  it("reads the group and plural of a class with a crd, once per group", () => {
    expect(getCustomResourcesOfRegistration(Example)).toEqual([{ group: "example.freelens.app", plural: "examples" }]);
  });

  it("names every group of the crd's versions", () => {
    class Moved extends LensExtensionKubeObject {
      static readonly kind = "Moved";
      static readonly crd = {
        apiVersions: ["old.freelens.app/v1", "new.freelens.app/v1"],
        plural: "moveds",
        singular: "moved",
      };
    }

    expect(getCustomResourcesOfRegistration(Moved)).toEqual([
      { group: "old.freelens.app", plural: "moveds" },
      { group: "new.freelens.app", plural: "moveds" },
    ]);
  });

  it("reads the group and plural of a class without a crd from its apiBase", () => {
    expect(getCustomResourcesOfRegistration(ExampleFromApiBase)).toEqual([
      { group: "example.freelens.app", plural: "examples" },
    ]);
  });

  it("rejects a class without kind", () => {
    class NoKind extends LensExtensionKubeObject {
      static readonly crd = Example.crd;
    }

    expect(() => getCustomResourcesOfRegistration(NoKind)).toThrow('the class has no static "kind"');
  });

  it("rejects a class with neither crd nor apiBase", () => {
    class Bare extends KubeObject {
      static readonly kind = "Bare";
    }

    expect(() => getCustomResourcesOfRegistration(Bare)).toThrow(
      'the class has neither "crd" nor a parseable static "apiBase"',
    );
  });

  it("rejects a crd without versions", () => {
    class NoVersions extends LensExtensionKubeObject {
      static readonly kind = "NoVersions";
      static readonly crd = { apiVersions: [], plural: "noversions", singular: "noversion" };
    }

    expect(() => getCustomResourcesOfRegistration(NoVersions)).toThrow('"crd.apiVersions" is empty');
  });

  it("rejects a crd without plural", () => {
    class NoPlural extends LensExtensionKubeObject {
      static readonly kind = "NoPlural";
      static readonly crd = { apiVersions: ["example.freelens.app/v1"], plural: "", singular: "noplural" };
    }

    expect(() => getCustomResourcesOfRegistration(NoPlural)).toThrow('"crd.plural" is empty');
  });

  it("rejects a resource of the core group", () => {
    class CorePod extends KubeObject {
      static readonly kind = "Pod";
      static readonly apiBase = "/api/v1/pods";
    }

    expect(() => getCustomResourcesOfRegistration(CorePod)).toThrow(
      '"apiBase" names the core group, which has no custom resources',
    );
  });

  it("rejects what is not a class", () => {
    expect(() => getCustomResourcesOfRegistration({} as unknown as CustomResourceRegistration)).toThrow(
      "it is not a class",
    );
  });
});

describe("describeCustomResourcesField", () => {
  it.each([
    [undefined, "undefined"],
    [null, "null"],
    [{}, "an object"],
    [Example, "the class Example"],
    ["Example", "a string"],
  ])("names %s as %s", (value, expected) => {
    expect(describeCustomResourcesField(value)).toBe(expected);
  });
});

describe("describeCustomResourceRegistration", () => {
  it("names the index and the class", () => {
    expect(describeCustomResourceRegistration(Example, 2)).toBe("customResources[2] (Example)");
  });

  it("names what is not a class as anonymous", () => {
    expect(describeCustomResourceRegistration(undefined as unknown as CustomResourceRegistration, 0)).toBe(
      "customResources[0] (<anonymous class>)",
    );
  });
});
