/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetchImplementationInjectionToken } from "../../common/fetch/fetch-injection-token";

import type { Fetch } from "@freelensapp/json-api";

/**
 * Chromium's `fetch`, which is the client the renderer uses.
 *
 * Not because a Node client is impossible here — the renderer is
 * node-integrated, and Freelens 1.x ran every `KubeJsonApi` call in this very
 * process through a CJS build of `node-fetch`. It is undici specifically that
 * cannot: it needs Node's global `setTimeout` (for `.unref()`) and
 * `performance.markResourceTiming`, and a module required in the renderer
 * shares the page's globals, which are Chromium's.
 *
 * It is also all the renderer needs. Requests go to the frame's own origin
 * (`https://<clusterId>.renderer.freelens.app:<port>`), which Chromium's
 * host-resolver rules map to 127.0.0.1 and whose certificate the window's
 * session already trusts, so lens-proxy gets the `Host` header it routes on
 * without anyone setting it.
 *
 * Wrapped rather than handed over directly, because the shared contract is
 * structural and Chromium's `RequestInit` is nominal. They diverge in two
 * places, and the assertion below — an assertion, not a conversion; nothing is
 * copied — covers both:
 *
 * - **the body.** `FetchBodyInit` admits any `Uint8Array`, while `BodyInit`
 *   names only views backed by a non-shared `ArrayBuffer`. Narrowing the
 *   contract to match would reject `Buffer`, which is what main-process callers
 *   actually hold.
 * - **the headers.** `FetchHeadersInit` admits a `Headers`-*like* instance —
 *   `get` and `forEach`, which is all this codebase reads — where `HeadersInit`
 *   names Chromium's `Headers` class itself. The reverse holds, so a real
 *   `Headers` can always be passed; it is only the structural member of the
 *   union that Chromium's types do not recognize.
 *
 * Both are cases of the contract being wider than one implementation, which is
 * what a supertype of two runtimes is for. This is the boundary that knows
 * which runtime it is talking to, so this is where it is narrowed.
 */
const browserFetchInjectable: Injectable<Fetch, unknown, void> = getInjectable({
  id: "browser-fetch",
  instantiate: (): Fetch => (url, init) => globalThis.fetch(url, init as RequestInit),
  injectionToken: fetchImplementationInjectionToken,
  causesSideEffects: true,
});

export default browserFetchInjectable;
