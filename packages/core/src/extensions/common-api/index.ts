/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalForExtensionApi } from "@freelensapp/legacy-global-di";
import { loggerInjectionToken } from "@freelensapp/logger";

// APIs
export { App } from "./app";
export * as EventBus from "./event-bus";
export * as Store from "./stores";
export * as Util from "./utils";
export * as Catalog from "./catalog";
export * as Types from "./types";
export * as Proxy from "./proxy";

export type { Logger } from "@freelensapp/logger";
export type { LensExtension } from "../lens-extension";
export type { PackageJson } from "type-fest";
export type { LensExtensionManifest, InstalledExtension } from "@freelensapp/legacy-extensions";

export const logger = asLegacyGlobalForExtensionApi(loggerInjectionToken);
