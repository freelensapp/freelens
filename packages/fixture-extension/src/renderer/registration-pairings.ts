/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The pairings `Renderer.K8sApi.detailsFor` and `menuItemFor` must reject,
// checked against the built `dist/extension-api.d.ts`. Each carries a
// `@ts-expect-error`, so a declaration that loses the tie between the class and
// the component fails the fixture's `type:check` with an unused directive:
//
//  - a component written for `Pod`, registered for `Deployment`;
//  - a component written for one version of `FixtureExample`, registered for
//    the class of the other. The two specs differ only in optional fields, so
//    they are assignable to each other, and only the literal `apiVersion` the
//    classes declare tells them apart.
//
// The positive pairings are the registrations in `./index.tsx`. Next to them,
// the narrowed model has to keep fitting the API and store types an extension
// names for it, which `narrowedModelApis` checks.
//
// Nothing imports this file, so it is part of no bundle, and the functions
// below are never called: only the types of their bodies matter.

import type { Common, Renderer } from "@freelensapp/extensions";

import type { ComponentClass, FunctionComponent } from "react";

import type { FixtureExample } from "./fixture-example";

declare const detailsFor: typeof Renderer.K8sApi.detailsFor;
declare const menuItemFor: typeof Renderer.K8sApi.menuItemFor;
declare const Deployment: typeof Renderer.K8sApi.Deployment;
declare const PodDetails: FunctionComponent<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>>;
declare const PodDetailsClass: ComponentClass<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>>;
declare const PodMenuItem: FunctionComponent<Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>>;
declare const PodMenuItemClass: ComponentClass<Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>>;

// The namespaces are imported as types only, so the base class and the model
// are declared values here.
declare const LensExtensionKubeObject: typeof Renderer.K8sApi.LensExtensionKubeObject;
declare const FixtureExampleV1alpha1: typeof FixtureExample;

interface FixtureExampleV1alpha2Spec {
  title?: string;
  suspended?: boolean;
}

class FixtureExampleV1alpha2 extends LensExtensionKubeObject<
  Renderer.K8sApi.NamespaceScopedMetadata,
  unknown,
  FixtureExampleV1alpha2Spec
> {
  declare kind: "FixtureExample";
  declare apiVersion: "fixture.freelens.app/v1alpha2";

  static readonly kind = "FixtureExample";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/fixture.freelens.app/v1alpha2/fixtureexamples";
  static readonly crd = {
    apiVersions: ["fixture.freelens.app/v1alpha2"],
    plural: "fixtureexamples",
    singular: "fixtureexample",
  };
}

declare const V1alpha1Details: FunctionComponent<Renderer.Component.KubeObjectDetailsProps<FixtureExample>>;
declare const V1alpha2DetailsClass: ComponentClass<Renderer.Component.KubeObjectDetailsProps<FixtureExampleV1alpha2>>;
declare const V1alpha1MenuItem: FunctionComponent<Common.Types.KubeObjectMenuItemProps<FixtureExample>>;
declare const V1alpha2MenuItemClass: ComponentClass<Common.Types.KubeObjectMenuItemProps<FixtureExampleV1alpha2>>;

export function mismatchedPairings() {
  return [
    // @ts-expect-error a function component written for `Pod`, registered for `Deployment`
    detailsFor(Deployment, { Details: PodDetails }),
    // @ts-expect-error a class component written for `Pod`, registered for `Deployment`
    detailsFor(Deployment, { Details: PodDetailsClass }),
    // @ts-expect-error a function component written for `Pod`, registered for `Deployment`
    menuItemFor(Deployment, { MenuItem: PodMenuItem }),
    // @ts-expect-error a class component written for `Pod`, registered for `Deployment`
    menuItemFor(Deployment, { MenuItem: PodMenuItemClass }),
    // @ts-expect-error a function component written for `v1alpha1`, registered for `v1alpha2`
    detailsFor(FixtureExampleV1alpha2, { Details: V1alpha1Details }),
    // @ts-expect-error a class component written for `v1alpha2`, registered for `v1alpha1`
    detailsFor(FixtureExampleV1alpha1, { Details: V1alpha2DetailsClass }),
    // @ts-expect-error a function component written for `v1alpha1`, registered for `v1alpha2`
    menuItemFor(FixtureExampleV1alpha2, { MenuItem: V1alpha1MenuItem }),
    // @ts-expect-error a class component written for `v1alpha2`, registered for `v1alpha1`
    menuItemFor(FixtureExampleV1alpha1, { MenuItem: V1alpha2MenuItemClass }),
  ];
}

// The `v1alpha2` class takes its own components, so what fails above is the
// swap and not the class.
export function matchedVersionPairings() {
  return [
    detailsFor(FixtureExampleV1alpha2, { Details: V1alpha2DetailsClass }),
    menuItemFor(FixtureExampleV1alpha2, { MenuItem: V1alpha2MenuItemClass }),
  ];
}

type FixtureExampleApi = Renderer.K8sApi.KubeApi<FixtureExample>;
type FixtureExampleStore = Renderer.K8sApi.KubeObjectStore<FixtureExample, FixtureExampleApi>;

declare const KubeApi: typeof Renderer.K8sApi.KubeApi;

export function narrowedModelApis(): [FixtureExampleApi, FixtureExampleApi, FixtureExampleStore] {
  return [
    new KubeApi({ objectConstructor: FixtureExampleV1alpha1 }),
    FixtureExampleV1alpha1.getApi<FixtureExample>(),
    FixtureExampleV1alpha1.getStore<FixtureExample, FixtureExampleStore>(),
  ];
}
