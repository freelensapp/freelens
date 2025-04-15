/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import navigateToCronJobsInjectable from "../../../../../common/front-end-routing/routes/cluster/workloads/cron-jobs/navigate-to-cron-jobs.injectable";
import { ResourceNames } from "../../../../utils/rbac";
import namespaceStoreInjectable from "../../../namespaces/store.injectable";
import cronJobsStoreInjectable from "../../../workloads-cronjobs/store.injectable";
import { workloadInjectionToken } from "../workload-injection-token";

const cronJobsWorkloadInjectable = getInjectable({
  id: "cron-jobs-workload",

  instantiate: (di) => {
    const navigate = di.inject(navigateToCronJobsInjectable);
    const namespaceStore = di.inject(namespaceStoreInjectable);
    const store = di.inject(cronJobsStoreInjectable);

    return {
      resource: {
        apiName: "cronjobs",
        group: "batch",
      },
      open: navigate,
      amountOfItems: computed(() => store.getAllByNs(namespaceStore.contextNamespaces).length),
      status: computed(() => store.getStatuses(store.getAllByNs(namespaceStore.contextNamespaces))),
      title: ResourceNames.cronjobs,
      orderNumber: 70,
    };
  },

  injectionToken: workloadInjectionToken,
});

export default cronJobsWorkloadInjectable;
