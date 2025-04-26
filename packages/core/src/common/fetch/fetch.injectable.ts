/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import fetch from "@freelensapp/node-fetch";
import { getInjectable } from "@ogre-tools/injectable";

export type Fetch = typeof fetch;

const fetchInjectable = getInjectable({
  id: "fetch",
  instantiate: () => fetch,
  causesSideEffects: true,
});

export default fetchInjectable;
