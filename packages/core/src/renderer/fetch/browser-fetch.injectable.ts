/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetchImplementationInjectionToken } from "../../common/fetch/fetch-injection-token";

import type { Fetch } from "@freelensapp/json-api";

/**
 * Chromium's `fetch`, which is the only client the renderer can use.
 *
 * A Node client cannot work here: undici needs Node's global `setTimeout` (for
 * `.unref()`) and `performance.markResourceTiming`, and a module required in
 * the renderer shares the page's globals, which are Chromium's.
 *
 * It is also all the renderer needs. Requests go to the frame's own origin
 * (`https://<clusterId>.renderer.freelens.app:<port>`), which Chromium's
 * host-resolver rules map to 127.0.0.1 and whose certificate the window's
 * session already trusts, so lens-proxy gets the `Host` header it routes on
 * without anyone setting it.
 */
const browserFetchInjectable: Injectable<Fetch, unknown, void> = getInjectable({
  id: "browser-fetch",
  instantiate: (): Fetch => globalThis.fetch.bind(globalThis),
  injectionToken: fetchImplementationInjectionToken,
  causesSideEffects: true,
});

export default browserFetchInjectable;
