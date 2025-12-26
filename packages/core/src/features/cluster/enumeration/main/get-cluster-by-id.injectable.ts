/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import clusterEnumerationInjectable from "../../../../main/cluster-enumeration/cluster-enumeration.injectable";

import type { ClusterId } from "../../../../extensions/common-api/cluster-types";

/**
 * Handler for getClusterByIdChannel IPC requests.
 * Returns a specific cluster by ID or undefined if not found.
 */
const getClusterByIdInjectable = getInjectable({
  id: "get-cluster-info-by-id",

  instantiate: (di) => {
    const clusterEnumeration = di.inject(clusterEnumerationInjectable);

    return (id: ClusterId) => clusterEnumeration.getById(id);
  },
});

export default getClusterByIdInjectable;
