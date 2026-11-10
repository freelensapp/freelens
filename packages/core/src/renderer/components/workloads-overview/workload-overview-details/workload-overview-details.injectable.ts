/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectionToken } from "@ogre-tools/injectable-extension-for-mobx";
import { sortBy } from "es-toolkit";
import { computed } from "mobx";
import { workloadOverviewDetailInjectionToken } from "./workload-overview-detail-injection-token";

const workloadOverviewDetailsInjectable = getInjectable({
  id: "workload-overview-details",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectionToken);
    const details = computedInjectMany(workloadOverviewDetailInjectionToken);

    return computed(() =>
      sortBy(
        details.get().filter((detail) => detail.enabled.get()),
        [(detail) => detail.orderNumber],
      ).map((detail) => detail.Component),
    );
  },
});

export default workloadOverviewDetailsInjectable;
