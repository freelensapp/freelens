/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import navigateToDeploymentsInjectable from "../../../../../common/front-end-routing/routes/cluster/workloads/deployments/navigate-to-deployments.injectable";
import { ResourceNames } from "../../../../utils/rbac";
import namespaceStoreInjectable from "../../../namespaces/store.injectable";
import deploymentsStoreInjectable from "../../../workloads-deployments/store.injectable";
import { workloadInjectionToken } from "../workload-injection-token";

const deploymentsWorkloadInjectable = getInjectable({
  id: "deployments-workload",

  instantiate: (di) => {
    const navigate = di.inject(navigateToDeploymentsInjectable);
    const namespaceStore = di.inject(namespaceStoreInjectable);
    const store = di.inject(deploymentsStoreInjectable);

    return {
      resource: {
        apiName: "deployments",
        group: "apps",
      },
      open: navigate,

      amountOfItems: computed(() => store.getAllByNs(namespaceStore.contextNamespaces).length),

      status: computed(() => store.getStatuses(store.getAllByNs(namespaceStore.contextNamespaces))),

      title: ResourceNames.deployments,
      orderNumber: 20,
    };
  },

  injectionToken: workloadInjectionToken,
});

export default deploymentsWorkloadInjectable;
