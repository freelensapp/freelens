/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable, lifecycleEnum } from "@ogre-tools/injectable";
import { when } from "mobx";
import { asyncComputed } from "../../../../common/utils/async-computed";
import helmChartsInjectable from "./helm-charts.injectable";
import requestVersionsOfHelmChartInjectable from "./request-versions-of-chart-for-release.injectable";

import type { HelmRelease } from "../../../../common/k8s-api/endpoints/helm-releases.api";

const helmChartVersionsInjectable = getInjectable({
  id: "helm-chart-versions-loader",

  instantiate: (di, release) => {
    const helmCharts = di.inject(helmChartsInjectable);
    const requestVersionsOfHelmChart = di.inject(requestVersionsOfHelmChartInjectable);

    return asyncComputed({
      getValueFromObservedPromise: async () => {
        await when(() => !helmCharts.pending.get());

        return requestVersionsOfHelmChart(release, helmCharts.value.get());
      },
    });
  },

  lifecycle: lifecycleEnum.keyedSingleton({
    getInstanceKey: (di, release: HelmRelease) => `${release.namespace}/${release.name}}`,
  }),
});

export default helmChartVersionsInjectable;
