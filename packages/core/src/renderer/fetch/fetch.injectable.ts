/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, type Injectable } from "@ogre-tools/injectable";

export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const fetchInjectable: Injectable<Fetch, unknown, void> = getInjectable({
  id: "fetch",
  instantiate: (di) => fetch,
});

export default fetchInjectable;
