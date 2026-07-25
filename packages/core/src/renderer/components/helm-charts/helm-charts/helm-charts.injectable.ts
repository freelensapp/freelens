/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import requestHelmChartsInjectable from "../../../../common/k8s-api/endpoints/helm-charts.api/request-charts.injectable";
import { asyncComputed } from "../../../../common/utils/async-computed";

const helmChartsInjectable = getInjectable({
  id: "helm-charts",

  instantiate: (di) => {
    const requestHelmCharts = di.inject(requestHelmChartsInjectable);

    return asyncComputed({
      getValueFromObservedPromise: requestHelmCharts,
      valueWhenPending: [],
    });
  },
});

export default helmChartsInjectable;
