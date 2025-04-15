import { getRandomIdInjectionToken } from "@freelensapp/random";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const getRandomIdForPodLogsTabInjectable = getInjectable({
  id: "get-random-id-for-pod-logs-tab",
  instantiate: (di) => di.inject(getRandomIdInjectionToken),
});

export default getRandomIdForPodLogsTabInjectable;
