/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The type level of the fixture: every name below has to be reachable from the
// published namespaces of `@freelensapp/extensions`. It carries no runtime code
// and is part of neither bundle — the fixture's `type:check` is the assertion,
// and it runs against the built `dist/extension-api.d.ts`. It sits in
// `src/common/` because it is valid in both environments, so all three
// programs compile it.
//
// This is what catches the #2365 class. A symbol a namespace re-exports as a
// value but not as a type is not nameable in a signature, so it cannot be
// written here at all: the failure is a compile error rather than a runtime
// surprise in somebody else's repository. It also covers the parts of `Main`
// the main entry point does not use, and the type-only members of `Common`,
// which no runtime assertion can reach.

import type { Common, Main, Renderer } from "@freelensapp/extensions";

// --- Common ----------------------------------------------------------------

export type FixtureManifest = Common.LensExtensionManifest;
export type FixturePackageJson = Common.PackageJson;
export type FixtureLogger = Common.Logger;
export type FixtureInstalledExtension = Common.InstalledExtension;
export type FixtureCluster = Common.Catalog.KubernetesCluster;
export type FixtureClusterConnectionStatus = Common.Clusters.ClusterConnectionStatus;
export type FixtureStatusBarRegistration = Common.Types.StatusBarRegistration;
export type FixtureShellEnvModifier = Common.Types.ShellEnvModifier;
export type FixturePageRegistration = Common.Types.PageRegistration;
export type FixtureAppPreferenceRegistration = Common.Types.AppPreferenceRegistration;
export type FixtureProtocolHandlerRegistration = Common.Types.ProtocolHandlerRegistration;
export type FixtureCustomResourceRegistration = Common.Types.CustomResourceRegistration;

// The `fetch` option of a bundled library, typed with the environment's own
// standard `fetch` types, the way the MCP SDK types its transports'.
// `Main.Util.fetch` has to fit it without an assertion, in all three programs:
// with `@types/node`'s types in main, the DOM's in the renderer and the
// worker's in common. `src/main/host-fetch.ts` passes it to one.
type LibraryFetchOption = (url: string | URL, init?: RequestInit) => Promise<Response>;

// A store model declared as an `interface` has no implicit index signature, and
// the store's params have to take it anyway: as `defaults`, exactly as declared,
// and as the model of the store a migration is given.
interface FixtureStoreModel {
  podLogsTailLines: number;
}
type FixtureStoreParams = ConstructorParameters<typeof Common.Store.ExtensionStore<FixtureStoreModel>>[0];
type FixtureStoreMigration = NonNullable<FixtureStoreParams["migrations"]>[string];
type FixtureMigratedModel = Parameters<FixtureStoreMigration>[0]["store"];

export type StoreTakesAnInterfaceModelAsDefaults = Holds<
  { configName: string; defaults: FixtureStoreModel } extends FixtureStoreParams ? true : false
>;
export type StoreParamsAreTheExportedOnes = Holds<
  FixtureStoreParams extends Common.Store.ExtensionStoreParams<FixtureStoreModel> ? true : false
>;
export type StoreMigrationIsTypedByTheModel = Holds<FixtureMigratedModel extends FixtureStoreModel ? true : false>;
// By the model alone: widened with an index signature, any key would be one.
export type StoreMigrationHasOnlyTheKeysOfTheModel = Holds<string extends keyof FixtureMigratedModel ? false : true>;

// --- Main ------------------------------------------------------------------

export type FixtureMainExtension = Main.LensExtension;
export type FixtureMainFetch = typeof Main.Util.fetch;
export type MainFetchFitsALibrary = Holds<FixtureMainFetch extends LibraryFetchOption ? true : false>;
export type FixtureMainNavigate = typeof Main.Navigation.navigate;
export type FixturePowerEventListener = Main.Power.PowerEventListener;
export type FixtureShellDownloadOptions = Main.Shell.KubectlDownloadOptions;
export type FixtureShellDownloadProgress = Main.Shell.KubectlDownloadProgress;
export type FixtureShellEnvironment = Awaited<ReturnType<typeof Main.Shell.getEnvironment>>;

// The `K8sApi` members the source declares as a type alias and a const of the
// same name. The bundler used to keep only the const of such a pair.
export type FixtureMainKubeApi = Main.K8sApi.KubeApi<Main.K8sApi.Pod>;
export type FixtureMainKubeJsonApi = Main.K8sApi.KubeJsonApi;
export type FixtureMainPodsApi = Main.K8sApi.PodsApi;
export type FixtureMainNodesApi = Main.K8sApi.NodesApi;
export type FixtureMainDeploymentApi = Main.K8sApi.DeploymentApi;
export type FixtureMainIngressApi = Main.K8sApi.IngressApi;
export type FixtureMainPersistentVolumeClaimsApi = Main.K8sApi.PersistentVolumeClaimsApi;

// --- Renderer --------------------------------------------------------------

export type FixtureRendererExtensionType = Renderer.LensExtension;
// The renderer's HTTP client is its global `fetch`, so the namespace has none.
// @ts-expect-error `Renderer.Util` has no `fetch`
export type FixtureRendererFetch = typeof Renderer.Util.fetch;
export type FixtureRendererNavigate = typeof Renderer.Navigation.navigate;
export type FixtureIconProps = Renderer.Component.IconProps;

// The same pairs in `Renderer.K8sApi`.
export type FixtureRendererKubeApi = Renderer.K8sApi.KubeApi<Renderer.K8sApi.Pod>;
export type FixtureRendererKubeJsonApi = Renderer.K8sApi.KubeJsonApi;
export type FixtureRendererPodsApi = Renderer.K8sApi.PodsApi;
export type FixtureRendererNodesApi = Renderer.K8sApi.NodesApi;
export type FixtureRendererDeploymentApi = Renderer.K8sApi.DeploymentApi;
export type FixtureRendererIngressApi = Renderer.K8sApi.IngressApi;
export type FixtureRendererPersistentVolumeClaimsApi = Renderer.K8sApi.PersistentVolumeClaimsApi;

// `DeploymentApi` and `IngressApi` are the common pairs in `Renderer.K8sApi`
// too, as they are at runtime: constructed with the options only, not with the
// host's dependency bag that the host's classes of the same name take.
type Holds<T extends true> = T;

export type RendererDeploymentApiTakesOptionsOnly = Holds<
  ConstructorParameters<typeof Renderer.K8sApi.DeploymentApi> extends [opts?: unknown] ? true : false
>;
export type RendererIngressApiTakesOptionsOnly = Holds<
  ConstructorParameters<typeof Renderer.K8sApi.IngressApi> extends [opts?: unknown] ? true : false
>;

// A registered component gets only the props the host renders it with. One that
// requires another prop, such as the extension instance, must not compile: the
// host would render it with that prop `undefined`.
type RequiresExtension = (props: { extension: FixtureRendererExtensionType }) => null;
type FixturePage = Common.Types.PageComponents["Page"];
type FixturePreferenceInput = Common.Types.AppPreferenceComponents["Input"];
type FixturePreferenceHint = Common.Types.AppPreferenceComponents["Hint"];
type FixtureMenuItem = Common.Types.KubeObjectMenuRegistration["components"]["MenuItem"];
type FixtureClusterFrameComponent = FixtureRendererExtensionType["clusterFrameComponents"][number]["Component"];

export type PageTakesParams = Holds<
  ((props: Common.Types.PageComponentProps) => null) extends FixturePage ? true : false
>;
export type PageRequiringMoreThanParamsIsRejected = Holds<
  // @ts-expect-error a page receives only `params`
  RequiresExtension extends FixturePage ? true : false
>;
export type PreferenceInputRequiringPropsIsRejected = Holds<
  // @ts-expect-error a preference input is rendered without props
  RequiresExtension extends FixturePreferenceInput ? true : false
>;
export type PreferenceHintRequiringPropsIsRejected = Holds<
  // @ts-expect-error a preference hint is rendered without props
  RequiresExtension extends FixturePreferenceHint ? true : false
>;
export type MenuItemTypedForItsKindFits = Holds<
  ((props: Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>) => null) extends FixtureMenuItem ? true : false
>;
export type MenuItemRequiringMoreThanItsPropsIsRejected = Holds<
  // @ts-expect-error a menu item receives only `object` and `toolbar`
  ((props: Common.Types.KubeObjectMenuItemProps & Parameters<RequiresExtension>[0]) => null) extends FixtureMenuItem
    ? true
    : false
>;
// A details or menu component typed for the resource it is registered for has
// to fit the registration without a cast: a built-in class, whose members the
// registration's default object type must not require, and an extension's own
// model with a member beyond `spec` and `status`.
interface FixtureModelWithMethod
  extends Renderer.K8sApi.LensExtensionKubeObject<
    Renderer.K8sApi.KubeObject["metadata"],
    { conditions: string[] },
    { listeners: string[] }
  > {
  getListeners(): string[];
}
type FixtureDetails = FixtureRendererExtensionType["kubeObjectDetailItems"][number]["components"]["Details"];
type FixtureRegisteredMenuItem = FixtureRendererExtensionType["kubeObjectMenuItems"][number]["components"]["MenuItem"];

export type DetailsTypedForBuiltInKindFits = Holds<
  ((props: Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Pod>) => null) extends FixtureDetails
    ? true
    : false
>;
export type DetailsTypedForModelWithMethodFits = Holds<
  ((props: Renderer.Component.KubeObjectDetailsProps<FixtureModelWithMethod>) => null) extends FixtureDetails
    ? true
    : false
>;
export type RegisteredMenuItemTypedForBuiltInKindFits = Holds<
  ((props: Common.Types.KubeObjectMenuItemProps<Renderer.K8sApi.Pod>) => null) extends FixtureRegisteredMenuItem
    ? true
    : false
>;
export type RegisteredMenuItemTypedForModelWithMethodFits = Holds<
  ((props: Common.Types.KubeObjectMenuItemProps<FixtureModelWithMethod>) => null) extends FixtureRegisteredMenuItem
    ? true
    : false
>;
export type ClusterFrameComponentRequiringPropsIsRejected = Holds<
  // @ts-expect-error a cluster frame component is rendered without props
  RequiresExtension extends FixtureClusterFrameComponent ? true : false
>;

// The namespaces have to work in type positions in a signature, not only as
// aliases — that is how an extension author actually reaches them.
export declare function describeFixtureExtension(
  extension: FixtureRendererExtensionType,
  manifest: FixtureManifest,
): FixturePackageJson;

export declare function renderFixtureIcon(props: FixtureIconProps): FixtureStatusBarRegistration;
