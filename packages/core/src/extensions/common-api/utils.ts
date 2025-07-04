/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalFunctionForExtensionApi, getLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import openLinkInBrowserInjectable from "../../common/utils/open-link-in-browser.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";

export * from "@freelensapp/utilities";
export { Singleton } from "../../common/utils/singleton";

export type * from "@freelensapp/utilities";

export type { OpenLinkInBrowser } from "../../common/utils/open-link-in-browser.injectable";

export const openExternal = asLegacyGlobalFunctionForExtensionApi(openLinkInBrowserInjectable);
export const openBrowser = asLegacyGlobalFunctionForExtensionApi(openLinkInBrowserInjectable);

export const getAppVersion = () => {
  const di = getLegacyGlobalDiForExtensionApi();

  return di.inject(buildVersionInitializable.stateToken);
};
