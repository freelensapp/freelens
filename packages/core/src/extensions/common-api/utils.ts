/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalFunctionForExtensionApi, getLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import * as utilities from "@freelensapp/utilities";
import openLinkInBrowserInjectable, {
  type OpenLinkInBrowser,
} from "../../common/utils/open-link-in-browser.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";

export type { OpenLinkInBrowser };

const Util = {
  ...utilities,

  openExternal: asLegacyGlobalFunctionForExtensionApi(openLinkInBrowserInjectable),
  openBrowser: asLegacyGlobalFunctionForExtensionApi(openLinkInBrowserInjectable),

  getAppVersion: () => {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(buildVersionInitializable.stateToken);
  },
};

export { Util };
