/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import { loggerInjectionToken } from "@freelensapp/logger";

// APIs
export { App } from "./app";
export * as Catalog from "./catalog";
export * as Clusters from "./cluster-types";
export * as EventBus from "./event-bus";
export * as Proxy from "./proxy";
export * as Store from "./stores";
export * as Types from "./types";
export { Util } from "./utils";

export type { InstalledExtension, LensExtensionManifest } from "@freelensapp/legacy-extensions";
export type { Logger } from "@freelensapp/logger";

export type { PackageJson } from "type-fest";

export type { LensExtension } from "../lens-extension";

export const logger = asLegacyGlobalForExtensionApi(loggerInjectionToken);
