/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { pipeline } from "@ogre-tools/fp";
import { getInjectable } from "@ogre-tools/injectable";
import { computedInjectManyInjectable } from "@ogre-tools/injectable-extension-for-mobx";
import { filter, map, sortBy } from "lodash/fp";
import { computed } from "mobx";
import { workloadOverviewDetailInjectionToken } from "./workload-overview-detail-injection-token";

const workloadOverviewDetailsInjectable = getInjectable({
  id: "workload-overview-details",

  instantiate: (di) => {
    const computedInjectMany = di.inject(computedInjectManyInjectable);
    const details = computedInjectMany(workloadOverviewDetailInjectionToken);

    return computed(() =>
      pipeline(
        details.get(),
        filter((detail) => detail.enabled.get()),
        sortBy((detail) => detail.orderNumber),
        map((detail) => detail.Component),
      ),
    );
  },
});

export default workloadOverviewDetailsInjectable;
