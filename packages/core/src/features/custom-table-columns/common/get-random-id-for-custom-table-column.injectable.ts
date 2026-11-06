/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";

const getRandomIdForCustomTableColumnInjectable = getInjectable({
  id: "get-random-id-for-custom-table-column",
  instantiate: (di) => di.inject(getRandomIdInjectionToken),
});

export default getRandomIdForCustomTableColumnInjectable;
