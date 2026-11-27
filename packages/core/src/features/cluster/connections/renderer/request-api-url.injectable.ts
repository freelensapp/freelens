/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { clusterApiUrlChannel } from "../common/api-url-channel";

import type { ClusterId } from "../../../../common/cluster-types";

export type RequestClusterApiUrl = (clusterId: ClusterId) => Promise<string | undefined>;

const requestClusterApiUrlInjectable = getInjectable({
  id: "request-cluster-api-url",
  instantiate: (di): RequestClusterApiUrl => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (clusterId) => requestFromChannel(clusterApiUrlChannel, clusterId);
  },
});

export default requestClusterApiUrlInjectable;
