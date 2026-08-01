/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import browserFetchInjectable from "../../renderer/fetch/browser-fetch.injectable";
import { Util as CommonUtil } from "../common-api/utils";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";

export type { OpenLinkInBrowser } from "../common-api/utils";

const Util = {
  ...CommonUtil,

  /**
   * HTTP from the renderer, as the application itself makes it.
   *
   * Today this is Chromium's `fetch`, which is already enough here: requests
   * go to the frame's own origin, whose certificate the window's session
   * trusts and which lens-proxy routes on without anyone setting a header.
   *
   * It is deliberately not documented as "an alias for the global". The
   * renderer session takes the *system* proxy
   * (`setup-session-proxy-bypass.injectable.ts`) while only main honours the
   * `httpsProxy` preference; if that asymmetry is ever fixed, extensions
   * sitting on this symbol get the fix and extensions sitting on the global do
   * not.
   *
   * The main-process counterpart is `Main.Util.fetch`.
   */
  fetch: asLazyInjectedFunctionForExtensionApi(browserFetchInjectable),
};

export { Util };
