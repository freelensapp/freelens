/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import fetch from "@freelensapp/node-fetch";
import { getInjectable, type Injectable } from "@ogre-tools/injectable";

export type Fetch = typeof fetch;

const fetchInjectable: Injectable<typeof fetch, unknown, void> = getInjectable({
  id: "fetch",
  instantiate: (di) => {
    return fetch;
  },
  causesSideEffects: true,
});

export default fetchInjectable;
