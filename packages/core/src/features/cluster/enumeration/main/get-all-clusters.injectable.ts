/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import clusterEnumerationInjectable from "../../../../main/cluster-enumeration/cluster-enumeration.injectable";

/**
 * Handler for getAllClustersChannel IPC requests.
 * Returns all registered Kubernetes clusters as ClusterInfo[].
 */
const getAllClustersInjectable = getInjectable({
  id: "get-all-clusters",

  instantiate: (di) => {
    const clusterEnumeration = di.inject(clusterEnumerationInjectable);

    return () => clusterEnumeration.clusters;
  },
});

export default getAllClustersInjectable;
