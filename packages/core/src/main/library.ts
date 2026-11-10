/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export * as Mobx from "mobx";
export * as Pty from "node-pty";
export { nodeEnvInjectionToken } from "../common/vars/node-env-injection-token";
export { assertExtensionApiSingletonNames } from "../extensions/api-globals/global-name-for-module-id";
export {
  mainExtensionApiSingletonModuleIds,
  mainExtensionApiSingletons,
} from "../extensions/api-globals/main-singletons";
export * as commonExtensionApi from "../extensions/common-api";
export * as mainExtensionApi from "../extensions/main-api";
// @experimental
export { registerLensCore } from "./register-lens-core";

export type { ExtensionApiSingletonsOnGlobal } from "../extensions/api-globals/global-shape";
