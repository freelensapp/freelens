/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";

export interface FixtureExampleSpec {
  title?: string;
  active?: boolean;
}

/**
 * A model class written the way the docs recommend: the instance `kind` and
 * `apiVersion` are declared as the literals of the static `kind` and
 * `crd.apiVersions`, which is what lets `detailsFor` and `menuItemFor` tell it
 * apart from another version of the same kind. `declare` emits nothing, so the
 * bundle carries the class exactly as it would without the two lines.
 */
export class FixtureExample extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.NamespaceScopedMetadata,
  unknown,
  FixtureExampleSpec
> {
  declare kind: "FixtureExample";
  declare apiVersion: "fixture.freelens.app/v1alpha1";

  static readonly kind = "FixtureExample";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/fixture.freelens.app/v1alpha1/fixtureexamples";
  static readonly crd = {
    apiVersions: ["fixture.freelens.app/v1alpha1"],
    plural: "fixtureexamples",
    singular: "fixtureexample",
  };
}
