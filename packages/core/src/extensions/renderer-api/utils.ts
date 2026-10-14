/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import browserFetchInjectable from "../../renderer/fetch/browser-fetch.injectable";
import { asStandardFetch } from "../common-api/standard-fetch";
import { Util as CommonUtil } from "../common-api/utils";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";

const Util = {
  ...CommonUtil,

  /**
   * HTTP from the renderer, as the application itself makes it.
   *
   * Today this is Chromium's `fetch`, which is already enough here: requests
   * go to the frame's own origin, whose certificate the window's session
   * trusts and which freelens-proxy routes on without anyone setting a header.
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

  /**
   * `fetch` of this namespace, typed as the standard `fetch`, for a bundled
   * library that takes a `fetch` option, such as an SDK or an MCP transport.
   *
   * It takes a URL, as a string or a `URL`, and an init, which it passes on
   * as it is apart from `dispatcher`. A `Request` as the input is refused: the
   * call rejects with a `TypeError`. The response is Chromium's `Response`.
   */
  standardFetch: asStandardFetch(asLazyInjectedFunctionForExtensionApi(browserFetchInjectable)),
};

export { Util };
