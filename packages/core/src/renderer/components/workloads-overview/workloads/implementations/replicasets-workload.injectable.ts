/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import navigateToReplicasetsInjectable from "../../../../../common/front-end-routing/routes/cluster/workloads/replicasets/navigate-to-replicasets.injectable";
import { ResourceNames } from "../../../../utils/rbac";
import namespaceStoreInjectable from "../../../namespaces/store.injectable";
import replicasetsStoreInjectable from "../../../workloads-replicasets/store.injectable";
import { workloadInjectionToken } from "../workload-injection-token";

const replicasetsWorkloadInjectable = getInjectable({
  id: "replicasets-workload",

  instantiate: (di) => {
    const navigate = di.inject(navigateToReplicasetsInjectable);
    const namespaceStore = di.inject(namespaceStoreInjectable);
    const store = di.inject(replicasetsStoreInjectable);

    return {
      resource: {
        apiName: "replicasets",
        group: "apps",
      },
      open: navigate,

      amountOfItems: computed(() => store.getAllByNs(namespaceStore.contextNamespaces).length),

      status: computed(() => store.getStatuses(store.getAllByNs(namespaceStore.contextNamespaces))),

      title: ResourceNames.replicasets,
      orderNumber: 50,
    };
  },

  injectionToken: workloadInjectionToken,
});

export default replicasetsWorkloadInjectable;
