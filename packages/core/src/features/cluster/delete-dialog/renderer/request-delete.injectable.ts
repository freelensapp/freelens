/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { deleteClusterChannel } from "../common/delete-channel";

import type { ClusterId } from "../../../../common/cluster-types";

export type RequestDeleteCluster = (clusterId: ClusterId) => Promise<void>;

const requestDeleteClusterInjectable = getInjectable({
  id: "request-delete-cluster",
  instantiate: (di): RequestDeleteCluster => {
    const requestChannel = di.inject(requestFromChannelInjectionToken);

    return (clusterId) => requestChannel(deleteClusterChannel, clusterId);
  },
});

export default requestDeleteClusterInjectable;
