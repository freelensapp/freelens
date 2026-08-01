/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetch as undiciFetch } from "undici";
import { fetchImplementationInjectionToken } from "../../common/fetch/fetch-injection-token";
import { withHostHeaderPreserved } from "./host-header-dispatcher";

import type { Fetch } from "@freelensapp/json-api";

import type { RequestInit as UndiciRequestInit, Response as UndiciResponse } from "undici";

/**
 * The main process reaches lens-proxy over a socket to 127.0.0.1 and routes to
 * a cluster with a `Host` header, which `fetch` would drop — see
 * {@link withHostHeaderPreserved}.
 *
 * undici's own `fetch` rather than Node's global one: the dispatchers passed
 * with a request come from the `undici` package, and the copy of undici that
 * Node embeds does not accept them.
 */
const undiciFetchInjectable: Injectable<Fetch, unknown, void> = getInjectable({
  id: "undici-fetch",
  instantiate: (): Fetch => async (url, init) => {
    // undici's `Response` is spec-compliant but nominally distinct from the
    // DOM one the shared type uses; only this boundary knows they are the
    // same shape.
    const response = await undiciFetch(url, withHostHeaderPreserved(init) as UndiciRequestInit);

    return response as UndiciResponse as unknown as Response;
  },
  injectionToken: fetchImplementationInjectionToken,
  causesSideEffects: true,
});

export default undiciFetchInjectable;
