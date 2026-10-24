/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action, computed } from "mobx";
import clusterOverviewStorageInjectable from "./storage.injectable";

import type { MetricType } from "./storage.injectable";

export type SelectedMetricsType = ReturnType<(typeof selectedMetricsTypeInjectable)["instantiate"]>;

const selectedMetricsTypeInjectable = getInjectable({
  id: "selected-metrics-type",
  instantiate: (di) => {
    const storage = di.inject(clusterOverviewStorageInjectable);
    const value = computed(() => storage.get().metricType);

    return {
      value,
      set: action((value: MetricType) => {
        storage.merge({ metricType: value });
      }),
    };
  },
});

export default selectedMetricsTypeInjectable;
