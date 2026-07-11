/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as utilities from "@freelensapp/utilities";
import openLinkInBrowserInjectable, {
  type OpenLinkInBrowser,
} from "../../common/utils/open-link-in-browser.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import { asLazyInjectedFunctionForExtensionApi, getDiForExtensionApi } from "../extension-api-di";

export type { OpenLinkInBrowser };

const Util = {
  ...utilities,

  openExternal: asLazyInjectedFunctionForExtensionApi(openLinkInBrowserInjectable),
  openBrowser: asLazyInjectedFunctionForExtensionApi(openLinkInBrowserInjectable),

  getAppVersion: () => {
    const di = getDiForExtensionApi();

    return di.inject(buildVersionInitializable.stateToken);
  },
};

export { Util };
