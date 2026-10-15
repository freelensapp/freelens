/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import proxyFetchInjectable from "../../main/fetch/proxy-fetch.injectable";
import { Util as CommonUtil } from "../common-api/utils";
import { asLazyInjectedFunctionForExtensionApi } from "../extension-api-di";
import { asHostFetch } from "./host-fetch";

const Util = {
  ...CommonUtil,

  /**
   * HTTP from the main process, as the application itself makes it, typed as
   * the standard `fetch`.
   *
   * `globalThis.fetch` exists here too, but it knows nothing about the
   * `httpsProxy` preference, `caCertificates` / `allowUntrustedCAs`, or
   * freelens-proxy — all three of which this client already honours. An extension
   * reaching an external service from main should use this rather than bundle
   * an HTTP client of its own, and pass it as the `fetch` option of a bundled
   * library that takes one, such as an SDK or an MCP transport.
   *
   * A `Request` input is translated into a URL and an init, since the host's
   * client does not take the `Request` of Node's built-in undici. `dispatcher`
   * is dropped from the init: the host's applies the user's settings and is not
   * the extension's to replace. The response is undici's `Response`, so
   * `instanceof Response` is not a reliable check on it.
   *
   * There is no renderer counterpart: the global `fetch` of the renderer is
   * Chromium's, with the window session's settings, which is the client the
   * host uses there too.
   */
  fetch: asHostFetch(asLazyInjectedFunctionForExtensionApi(proxyFetchInjectable)),
};

export { Util };
