/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The type level of the fixture: every name below has to be reachable from the
// published namespaces of `@freelensapp/extensions`. It carries no runtime code
// and is not part of the bundle — `tsc -p tsconfig.json` is the assertion, and
// it runs against the built `dist/extension-api.d.ts`.
//
// This is what catches the #2365 class. A symbol a namespace re-exports as a
// value but not as a type is not nameable in a signature, so it cannot be
// written here at all: the failure is a compile error rather than a runtime
// surprise in somebody else's repository. It also covers `Main`, which the
// renderer bundle never touches, and the type-only members of `Common`, which
// no runtime assertion can reach.

import type { Common, Main, Renderer } from "@freelensapp/extensions";

// --- Common ----------------------------------------------------------------

export type FixtureManifest = Common.LensExtensionManifest;
export type FixturePackageJson = Common.PackageJson;
export type FixtureLogger = Common.Logger;
export type FixtureInstalledExtension = Common.InstalledExtension;
export type FixtureCluster = Common.Catalog.KubernetesCluster;
export type FixtureClusterConnectionStatus = Common.Clusters.ClusterConnectionStatus;
export type FixtureStatusBarRegistration = Common.Types.StatusBarRegistration;
export type FixtureMenuRegistration = Common.Types.MenuRegistration;
export type FixtureTrayMenuRegistration = Common.Types.TrayMenuRegistration;
export type FixtureShellEnvModifier = Common.Types.ShellEnvModifier;
export type FixturePageRegistration = Common.Types.PageRegistration;
export type FixtureAppPreferenceRegistration = Common.Types.AppPreferenceRegistration;
export type FixtureProtocolHandlerRegistration = Common.Types.ProtocolHandlerRegistration;

// --- Main ------------------------------------------------------------------

export type FixtureMainExtension = Main.LensExtension;
export type FixtureMainFetch = typeof Main.Util.fetch;
export type FixtureMainNavigate = typeof Main.Navigation.navigate;
export type FixturePowerEventListener = Main.Power.PowerEventListener;

// --- Renderer --------------------------------------------------------------

export type FixtureRendererExtensionType = Renderer.LensExtension;
export type FixtureRendererFetch = typeof Renderer.Util.fetch;
export type FixtureRendererNavigate = typeof Renderer.Navigation.navigate;
export type FixtureIconProps = Renderer.Component.IconProps;

// The namespaces have to work in type positions in a signature, not only as
// aliases — that is how an extension author actually reaches them.
export declare function describeFixtureExtension(
  extension: FixtureRendererExtensionType,
  manifest: FixtureManifest,
): FixturePackageJson;

export declare function renderFixtureIcon(props: FixtureIconProps): FixtureStatusBarRegistration;
