/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";
import { fetchImplementationInjectionToken } from "./fetch-injection-token";

import type { Fetch } from "@freelensapp/json-api";

export type {
  Fetch,
  FetchBodyInit,
  FetchHeadersInit,
  FetchRequestHeaders,
  FetchRequestInit,
  FetchResponse,
  FetchResponseHeaders,
} from "@freelensapp/json-api";

/**
 * The one `fetch` the application uses, in either process.
 *
 * This is deliberately a thin façade over
 * {@link fetchImplementationInjectionToken}: the implementation is
 * process-specific and must not be imported from `common/`, because pulling
 * undici into the renderer bundle breaks it — undici needs Node's global
 * `setTimeout` (for `.unref()`) and `performance.markResourceTiming`, and the
 * renderer's globals are Chromium's.
 */
const fetchInjectable: Injectable<Fetch, unknown, void> = getInjectable({
  id: "fetch",
  instantiate: (di) => di.inject(fetchImplementationInjectionToken),
});

export default fetchInjectable;
