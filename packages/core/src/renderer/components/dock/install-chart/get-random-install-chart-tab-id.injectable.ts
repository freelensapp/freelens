import { getRandomIdInjectionToken } from "@freelensapp/random";
/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";

const getRandomInstallChartTabIdInjectable = getInjectable({
  id: "get-random-install-chart-tab-id",
  instantiate: (di) => di.inject(getRandomIdInjectionToken),
});

export default getRandomInstallChartTabIdInjectable;
