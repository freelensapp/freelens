import { getRandomIdInjectionToken } from "@freelensapp/random";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const getRandomUpgradeChartTabIdInjectable = getInjectable({
  id: "get-random-upgrade-chart-tab-id",
  instantiate: (di) => di.inject(getRandomIdInjectionToken),
});

export default getRandomUpgradeChartTabIdInjectable;
