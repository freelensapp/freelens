/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { OverviewStatuses } from "../../overview-statuses";
import { workloadOverviewDetailInjectionToken } from "../workload-overview-detail-injection-token";

const overviewStatusesInjectable = getInjectable({
  id: "overview-statuses",

  instantiate: () => ({
    Component: OverviewStatuses,
    enabled: computed(() => true),
    orderNumber: 50,
  }),

  injectionToken: workloadOverviewDetailInjectionToken,
});

export default overviewStatusesInjectable;
