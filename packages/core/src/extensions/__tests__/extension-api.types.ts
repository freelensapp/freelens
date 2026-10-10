/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The type half of the extension-API surface check, and the half that has
// actually caught things.
//
// `./extension-api.test.ts` enumerates runtime *values* with `Object.keys`, so
// it cannot see a type at all. That blind spot is not hypothetical: a namespace
// may re-export a symbol as a value without re-exporting it as a type, which
// leaves it callable but not nameable in a signature — the #2365 class of
// defect, which cost `SecurityContext` the whole v2 line while every test
// passed, and which #2475 could have reintroduced with `KubeObjectStatus`.
//
// Naming a type **is** the assertion here. If a type stops being reachable
// through its namespace, this file stops compiling, and `pnpm type:check`
// already compiles it — there is no runner, no vitest typecheck mode and no
// tool behind this beyond the compiler the repository runs anyway. The file is
// never run and is imported by nothing; `knip.jsonc` lists it as an entry for
// that reason.
//
// It is the in-repo, source-level check. Its complement is
// `packages/fixture-extension/src/common/contract-types.ts`, which makes the
// same kind of assertion against the *built* `dist/extension-api.d.ts` — the
// artifact an author actually resolves — and so needs a build to run.
//
// The selection matches the anchors in `./extension-api.test.ts`: the types the
// two published extensions name in their own signatures, plus the three that
// were the bugs. It is deliberately not an enumeration; see the header of that
// file for why the exhaustive version was removed.

import type { ComponentClass, FunctionComponent } from "react";

import type { Common, Main, Renderer } from "../extension-api";

// --- Common ------------------------------------------------------------------

export type CommonManifest = Common.LensExtensionManifest;
export type CommonPackageJson = Common.PackageJson;
export type CommonLogger = Common.Logger;
export type CommonInstalledExtension = Common.InstalledExtension;
export type CommonCluster = Common.Catalog.KubernetesCluster;
export type CommonCatalogEntity = Common.Catalog.CatalogEntity;
export type CommonClusterConnectionStatus = Common.Clusters.ClusterConnectionStatus;

// `Common.Types` contributes nothing at runtime, so these are reachable from
// here and from nowhere else. `KubeObjectMenuItemProps` is the one the fluxcd
// extension names in every menu item it contributes.
export type CommonKubeObjectMenuItemProps = Common.Types.KubeObjectMenuItemProps;
export type CommonStatusBarRegistration = Common.Types.StatusBarRegistration;
export type CommonPageRegistration = Common.Types.PageRegistration;
export type CommonAppPreferenceRegistration = Common.Types.AppPreferenceRegistration;

// --- Main --------------------------------------------------------------------

export type MainExtension = Main.LensExtension;
export type MainFetch = typeof Main.Util.fetch;
export type MainNavigate = typeof Main.Navigation.navigate;
export type MainPowerEventListener = Main.Power.PowerEventListener;
export type MainKubeObject = Main.K8sApi.KubeObject;
export type MainKubeObjectStore = Main.K8sApi.KubeObjectStore<Main.K8sApi.KubeObject>;

// The three #2365 closed, named through `Main` as well as `Renderer` because
// the two namespaces re-export separately and only one of them was ever wrong.
export type MainSecurityContext = Main.K8sApi.SecurityContext;
export type MainKubeApiOptions = Main.K8sApi.KubeApiOptions<Main.K8sApi.KubeObject>;
export type MainKubeObjectStoreOptions = Main.K8sApi.KubeObjectStoreOptions;

// Added to `Main.K8sApi` by #2475 with nothing to show it. The name is shared
// by two types; this is the extension-facing status registration shape, the one
// that kept the bare name (see C5).
export type MainKubeObjectStatus = Main.K8sApi.KubeObjectStatus;

// --- Renderer ----------------------------------------------------------------

export type RendererExtension = Renderer.LensExtension;
export type RendererFetch = typeof Renderer.Util.fetch;
export type RendererNavigate = typeof Renderer.Navigation.navigate;
export type RendererDetailsUrl = typeof Renderer.Navigation.getDetailsUrl;
export type RendererActiveTheme = typeof Renderer.Theme.activeTheme;

// The prop types the published extensions write out by hand. A component whose
// props stop being nameable is unusable in a typed extension even though the
// component itself is still exported.
export type RendererKubeObjectDetailsProps = Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.KubeObject>;
export type RendererKubeObjectMenuProps = Renderer.Component.KubeObjectMenuProps<Renderer.K8sApi.KubeObject>;
export type RendererIconProps = Renderer.Component.IconProps;
export type RendererTableOrderBy = Renderer.Component.TableOrderBy;
export type RendererPieChartData = Renderer.Component.PieChartData;

// The custom-resource vocabulary: both published extensions declare their CRDs
// with these four and register the result with `apiManager`.
export type RendererKubeObjectMetadata = Renderer.K8sApi.KubeObjectMetadata;
export type RendererLensExtensionKubeObject = Renderer.K8sApi.LensExtensionKubeObject;
export type RendererLensExtensionKubeObjectCRD = Renderer.K8sApi.LensExtensionKubeObjectCRD;
export type RendererKubeApi = Renderer.K8sApi.KubeApi<Renderer.K8sApi.KubeObject>;

export type RendererSecurityContext = Renderer.K8sApi.SecurityContext;
export type RendererKubeApiOptions = Renderer.K8sApi.KubeApiOptions<Renderer.K8sApi.KubeObject>;
export type RendererKubeObjectStoreOptions = Renderer.K8sApi.KubeObjectStoreOptions;

// `ServicePort` is the return type of `Service.getPorts()`, so it is not
// withdrawable even in a major (C5).
export type RendererServicePort = Renderer.K8sApi.ServicePort;

// A namespace has to work in a signature, not only as an alias — that is how an
// author reaches it. A declared function is enough to require it.
export declare function describeContract(
  extension: RendererExtension,
  manifest: CommonManifest,
  props: RendererKubeObjectDetailsProps,
): CommonStatusBarRegistration;

// `detailsFor` and `menuItemFor` tie the component to the model class they are
// given, which the plain registrations cannot. Every `@ts-expect-error` below
// is a pairing that must not compile; a helper that accepts it leaves the
// directive unused, which fails the check. The function is never called: only
// its body's types matter.
declare const detailsFor: typeof Renderer.K8sApi.detailsFor;
declare const menuItemFor: typeof Renderer.K8sApi.menuItemFor;
declare const Pod: typeof Renderer.K8sApi.Pod;
declare const Deployment: typeof Renderer.K8sApi.Deployment;
declare const PodDetails: FunctionComponent<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>>;
declare const PodDetailsClass: ComponentClass<Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>>;
declare const PodMenuItem: FunctionComponent<Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>>;
declare const PodMenuItemClass: ComponentClass<Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>>;

export function checkRegistrationHelpers(extension: RendererExtension) {
  extension.kubeObjectDetailItems = [
    detailsFor(Pod, { Details: PodDetails }),
    detailsFor(Pod, { Details: PodDetailsClass, apiVersions: ["v1"], priority: 10 }),
    // @ts-expect-error a function component written for `Pod`, registered for `Deployment`
    detailsFor(Deployment, { Details: PodDetails }),
    // @ts-expect-error a class component written for `Pod`, registered for `Deployment`
    detailsFor(Deployment, { Details: PodDetailsClass }),
  ];
  extension.kubeObjectMenuItems = [
    menuItemFor(Pod, { MenuItem: PodMenuItem }),
    menuItemFor(Pod, { MenuItem: PodMenuItemClass, apiVersions: ["v1"] }),
    // @ts-expect-error a function component written for `Pod`, registered for `Deployment`
    menuItemFor(Deployment, { MenuItem: PodMenuItem }),
    // @ts-expect-error a class component written for `Pod`, registered for `Deployment`
    menuItemFor(Deployment, { MenuItem: PodMenuItemClass }),
  ];
}

// Two versions of one kind whose specs differ only in optional fields, as
// per-version classes usually do. Their specs are assignable to each other, so
// without the literal `kind` and `apiVersion` below a component of one version
// would compile against the class of the other; nothing here relies on that.
// With them, the swapped pairings must fail. `LensExtensionKubeObject` is a
// declared value because the namespaces are imported as types only.
declare const LensExtensionKubeObject: typeof Renderer.K8sApi.LensExtensionKubeObject;

interface ExampleSpecV1alpha1 {
  title?: string;
  active?: boolean;
}

interface ExampleSpecV1alpha2 {
  title?: string;
  suspended?: boolean;
}

class ExampleV1alpha1 extends LensExtensionKubeObject<
  Renderer.K8sApi.NamespaceScopedMetadata,
  unknown,
  ExampleSpecV1alpha1
> {
  declare kind: "Example";
  declare apiVersion: "example.freelens.app/v1alpha1";

  static readonly kind = "Example";
  static readonly crd = { apiVersions: ["example.freelens.app/v1alpha1"], plural: "examples", singular: "example" };
}

class ExampleV1alpha2 extends LensExtensionKubeObject<
  Renderer.K8sApi.NamespaceScopedMetadata,
  unknown,
  ExampleSpecV1alpha2
> {
  declare kind: "Example";
  declare apiVersion: "example.freelens.app/v1alpha2";

  static readonly kind = "Example";
  static readonly crd = { apiVersions: ["example.freelens.app/v1alpha2"], plural: "examples", singular: "example" };
}

declare const ExampleV1alpha1Details: FunctionComponent<Renderer.Component.KubeObjectDetailsProps<ExampleV1alpha1>>;
declare const ExampleV1alpha2DetailsClass: ComponentClass<Renderer.Component.KubeObjectDetailsProps<ExampleV1alpha2>>;
declare const ExampleV1alpha1MenuItem: FunctionComponent<Common.Types.KubeObjectMenuItemProps<ExampleV1alpha1>>;
declare const ExampleV1alpha2MenuItemClass: ComponentClass<Common.Types.KubeObjectMenuItemProps<ExampleV1alpha2>>;

export function checkNarrowedVersions(extension: RendererExtension) {
  extension.kubeObjectDetailItems = [
    detailsFor(ExampleV1alpha1, { Details: ExampleV1alpha1Details }),
    detailsFor(ExampleV1alpha2, { Details: ExampleV1alpha2DetailsClass }),
    // @ts-expect-error a function component written for `v1alpha1`, registered for `v1alpha2`
    detailsFor(ExampleV1alpha2, { Details: ExampleV1alpha1Details }),
    // @ts-expect-error a class component written for `v1alpha2`, registered for `v1alpha1`
    detailsFor(ExampleV1alpha1, { Details: ExampleV1alpha2DetailsClass }),
  ];
  extension.kubeObjectMenuItems = [
    menuItemFor(ExampleV1alpha1, { MenuItem: ExampleV1alpha1MenuItem }),
    menuItemFor(ExampleV1alpha2, { MenuItem: ExampleV1alpha2MenuItemClass }),
    // @ts-expect-error a function component written for `v1alpha1`, registered for `v1alpha2`
    menuItemFor(ExampleV1alpha2, { MenuItem: ExampleV1alpha1MenuItem }),
    // @ts-expect-error a class component written for `v1alpha2`, registered for `v1alpha1`
    menuItemFor(ExampleV1alpha1, { MenuItem: ExampleV1alpha2MenuItemClass }),
  ];
}
