/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { executeOnClusterChannel } from "../common/channels";

import type { ExecuteOnClusterRequest, ExecuteOnClusterResponse } from "../common/types";

type ExecuteOnCluster = (request: ExecuteOnClusterRequest) => Promise<ExecuteOnClusterResponse>;

const executeOnClusterInjectable = getInjectable({
  id: "execute-on-cluster",

  instantiate: (di): ExecuteOnCluster => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (request) => requestFromChannel(executeOnClusterChannel, request);
  },
});

export default executeOnClusterInjectable;
