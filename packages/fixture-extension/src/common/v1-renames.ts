/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The v2 side of every "Renamed or moved" row of the v1→v2 rename table in
// `docs/extensions/migrating-from-v1.md`, named in a type position with the v1 path
// it replaces next to it. Like `contract-types.ts` it carries no runtime code:
// the fixture's `type:check` is the assertion, so a replacement the guide
// points authors to that stops being reachable from the built declaration
// fails the build rather than a port.
//
// Keep this file and the table in step: a row added there gets a line here.

import type { Main, Renderer } from "@freelensapp/extensions";

// v1: Renderer.Component.getDetailsUrl
export type RenamedGetDetailsUrl = typeof Renderer.Navigation.getDetailsUrl;

// v1: Renderer.Component.showDetails
export type RenamedShowDetails = typeof Renderer.Navigation.showDetails;

// v1: Renderer.Theme.getActiveTheme()
export type RenamedGetActiveTheme = typeof Renderer.Theme.activeTheme.get;

// v1: Main.K8sApi.ResourceStack, constructed with (cluster, name)
export type RenamedMainResourceStack = ReturnType<typeof Main.K8sApi.createResourceStack>;
export type RenamedMainResourceStackApply = RenamedMainResourceStack["kubectlApplyFolder"];
export type RenamedMainResourceStackDelete = RenamedMainResourceStack["kubectlDeleteFolder"];

// v1: Renderer.K8sApi.ResourceStack, constructed with (cluster, name)
export type RenamedRendererResourceStack = ReturnType<typeof Renderer.K8sApi.createResourceStack>;
export type RenamedRendererResourceStackApply = RenamedRendererResourceStack["kubectlApplyFolder"];
export type RenamedRendererResourceStackDelete = RenamedRendererResourceStack["kubectlDeleteFolder"];

// v1: Renderer.Component.InputValidators.isExtensionNameInstallRegex.isMatch
export type RenamedIsExtensionNameInstallMatch =
  typeof Renderer.Component.InputValidators.isExtensionNameInstallRegex.test;

// v1: Renderer.Component.InputValidators.isExtensionNameInstallRegex.captures
export type RenamedExtensionNameInstallCaptures =
  typeof Renderer.Component.InputValidators.extensionNameInstallCaptures;

// Where the table promises the v1 call shape, hold the replacement to it: the
// same (cluster, name) arguments, and the same `{ name, version? }` result.
type Holds<T extends true> = T;

export type CreateResourceStackTakesV1Arguments = Holds<
  Parameters<typeof Renderer.K8sApi.createResourceStack> extends [cluster: unknown, name: string] ? true : false
>;

export type ExtensionNameInstallCapturesKeepsV1Result = Holds<
  ReturnType<RenamedExtensionNameInstallCaptures> extends { name: string; version?: string } | undefined ? true : false
>;
