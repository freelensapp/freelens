/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import openLinkInBrowserInjectable from "../../common/utils/open-link-in-browser.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import { asLegacyGlobalFunctionForExtensionApi, getLegacyGlobalDiForExtensionApi } from "@freelens/legacy-global-di";

export { Singleton } from "../../common/utils/singleton";

export {
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  prevDefault,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  stopPropagation,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  cssNames,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  disposer,
} from "@freelens/utilities";

export type {
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  IClassName,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  IgnoredClassNames,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  Disposer,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  Disposable,
  /**
   * @deprecated Switch to using the `@freelens/utilities` package
   */
  ExtendableDisposer,
} from "@freelens/utilities";

export type { OpenLinkInBrowser } from "../../common/utils/open-link-in-browser.injectable";

export const openExternal = asLegacyGlobalFunctionForExtensionApi(openLinkInBrowserInjectable);
export const openBrowser = asLegacyGlobalFunctionForExtensionApi(openLinkInBrowserInjectable);

export const getAppVersion = () => {
  const di = getLegacyGlobalDiForExtensionApi();

  return di.inject(buildVersionInitializable.stateToken);
};
