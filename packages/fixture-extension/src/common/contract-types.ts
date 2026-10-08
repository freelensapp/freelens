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

// --- Main ------------------------------------------------------------------

export type FixtureMainExtension = Main.LensExtension;
export type FixtureMainFetch = typeof Main.Util.fetch;
export type FixtureMainNavigate = typeof Main.Navigation.navigate;
export type FixturePowerEventListener = Main.Power.PowerEventListener;

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
type FixturePage = Common.Types.PageComponents["Page"];

export type PageTakesParams = Holds<
  ((props: Common.Types.PageComponentProps) => null) extends FixturePage ? true : false
>;
export type PageRequiringMoreThanParamsIsRejected = Holds<
  // @ts-expect-error a page receives only `params`
  ((props: { extension: FixtureRendererExtensionType }) => null) extends FixturePage ? true : false
>;

// The namespaces have to work in type positions in a signature, not only as
// aliases — that is how an extension author actually reaches them.
export declare function describeFixtureExtension(
  extension: FixtureRendererExtensionType,
  manifest: FixtureManifest,
): FixturePackageJson;

export declare function renderFixtureIcon(props: FixtureIconProps): FixtureStatusBarRegistration;
