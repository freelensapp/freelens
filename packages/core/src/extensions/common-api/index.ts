/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { asLazyInjectedForExtensionApi } from "../extension-api-di";

// APIs
export { App } from "./app";
export * as Catalog from "./catalog";
export * as Clusters from "./cluster-types";
export * as EventBus from "./event-bus";
export * as Proxy from "./proxy";
export * as Store from "./stores";
export * as Types from "./types";
export { Util } from "./utils";

export type { Logger } from "@freelensapp/logger";

export type { InstalledExtension, LensExtensionManifest } from "../installed-extension";

// A plain alias instead of a re-export: type-fest declares PackageJson as a
// type plus a same-named namespace. A declaration bundler that rewrites a
// namespace re-export into `declare const ...: typeof PackageJson` makes it
// invalid, because the namespace is type-only (TS2708 for consumers of the
// bundled d.ts); the alias holds whatever the bundler does with namespaces.
export type PackageJson = import("type-fest").PackageJson;

// A type alias instead of a type-only re-export: rolldown-plugin-dts declares a
// class re-exported with `export type` inside a namespace as a value too, and
// `Common.LensExtension` is not one at runtime, so `new` and `instanceof` on it
// would compile and throw. A type alias stays a type in the declaration.
export type LensExtension = import("../lens-extension").LensExtension;

export const logger = asLazyInjectedForExtensionApi(loggerInjectionToken);
