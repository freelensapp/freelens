/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import proxyFetchInjectable from "../../main/fetch/proxy-fetch.injectable";
import { asStandardFetch } from "../common-api/standard-fetch";
import { Util as CommonUtil } from "../common-api/utils";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";

const Util = {
  ...CommonUtil,

  /**
   * HTTP from the main process, as the application itself makes it.
   *
   * `globalThis.fetch` exists here too, but it knows nothing about the
   * `httpsProxy` preference, `caCertificates` / `allowUntrustedCAs`, or
   * freelens-proxy — all three of which this client already honours. An extension
   * reaching a cluster or an external service from main should use this rather
   * than bundle an HTTP client of its own.
   *
   * The renderer counterpart is `Renderer.Util.fetch`. They are separate
   * symbols because the implementations differ, and naming them separately is
   * the point: one `Common.Util.fetch` would restate an equivalence that does
   * not hold.
   */
  fetch: asLazyInjectedFunctionForExtensionApi(proxyFetchInjectable),

  /**
   * `fetch` of this namespace, typed as the standard `fetch`, for a bundled
   * library that takes a `fetch` option, such as an SDK or an MCP transport.
   * Passing it keeps the library on the host's client, with the user's proxy
   * and certificate settings, where the library's own default would ignore
   * them.
   *
   * It takes a URL, as a string or a `URL`, and an init, which it passes on
   * as it is apart from `dispatcher`. A `Request` as the input is refused: the
   * call rejects with a `TypeError`. The response is undici's `Response`, so
   * `instanceof Response` is not a reliable check on it.
   */
  standardFetch: asStandardFetch(asLazyInjectedFunctionForExtensionApi(proxyFetchInjectable)),
};

export { Util };
