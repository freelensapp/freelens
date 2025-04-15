/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import { getInjectable } from "@ogre-tools/injectable";

const getRandomIdForPodLogsTabInjectable = getInjectable({
  id: "get-random-id-for-pod-logs-tab",
  instantiate: (di) => di.inject(getRandomIdInjectionToken),
});

export default getRandomIdForPodLogsTabInjectable;
