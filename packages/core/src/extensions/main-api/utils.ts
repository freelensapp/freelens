/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import proxyFetchInjectable from "../../main/fetch/proxy-fetch.injectable";
import { Util as CommonUtil } from "../common-api/utils";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";

export type { OpenLinkInBrowser } from "../common-api/utils";

const Util = {
  ...CommonUtil,

  /**
   * HTTP from the main process, as the application itself makes it.
   *
   * `globalThis.fetch` exists here too, but it knows nothing about the
   * `httpsProxy` preference, `caCertificates` / `allowUntrustedCAs`, or
   * lens-proxy — all three of which this client already honours. An extension
   * reaching a cluster or an external service from main should use this rather
   * than bundle an HTTP client of its own.
   *
   * The renderer counterpart is `Renderer.Util.fetch`. They are separate
   * symbols because the implementations differ, and naming them separately is
   * the point: one `Common.Util.fetch` would restate an equivalence that does
   * not hold.
   */
  fetch: asLazyInjectedFunctionForExtensionApi(proxyFetchInjectable),
};

export { Util };
