/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import clustersStateInjectable from "./state.injectable";

import type { Cluster } from "../../../../common/cluster/cluster";
import type { ClusterId } from "../../../../common/cluster-types";

export type GetClusterById = (id: ClusterId) => Cluster | undefined;

const getClusterByIdInjectable = getInjectable({
  id: "get-cluster-by-id",
  instantiate: (di): GetClusterById => {
    const clustersState = di.inject(clustersStateInjectable);

    return (id) => clustersState.get(id);
  },
});

export default getClusterByIdInjectable;
