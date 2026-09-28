/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { FetchRequestInit, FetchResponse } from "@freelensapp/json-api";

import type { Dispatcher } from "undici";

/**
 * A request init as the **main** process makes it: the shared structural
 * contract plus the one undici extension main needs.
 *
 * `dispatcher` lives here rather than in `@freelensapp/json-api` because it is
 * meaningless anywhere else. The renderer has no dispatchers at all, and an
 * extension cannot fill the slot without depending on undici itself — which is
 * the dependency the published surface exists to spare it. Extensions that
 * need main-process HTTP get `Main.Util.fetch`, which is this client with the
 * dispatcher already chosen for them.
 *
 * `MainFetchRequestInit` and `FetchRequestInit` are mutually assignable (every
 * member of both is optional), so a main-process caller widens the injected
 * `Fetch` to {@link MainFetch} by annotation and needs no cast:
 *
 * ```ts
 * const fetch: MainFetch = di.inject(fetchInjectable);
 * ```
 */
export interface MainFetchRequestInit extends FetchRequestInit {
  /** The undici dispatcher to send this request through. */
  dispatcher?: Dispatcher;
}

/** `Fetch` as the main process sees it — see {@link MainFetchRequestInit}. */
export type MainFetch = (url: string | URL, init?: MainFetchRequestInit) => Promise<FetchResponse>;
