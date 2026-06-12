/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { setClusterAsDeletingChannel } from "../common/set-as-deleting-channel";

import type { ClusterId } from "../../../../common/cluster-types";

export type RequestSetClusterAsDeleting = (clusterId: ClusterId) => Promise<void>;

const requestSetClusterAsDeletingInjectable = getInjectable({
  id: "request-set-cluster-as-deleting",
  instantiate: (di): RequestSetClusterAsDeleting => {
    const requestChannel = di.inject(requestFromChannelInjectionToken);

    return (clusterId) => requestChannel(setClusterAsDeletingChannel, clusterId);
  },
});

export default requestSetClusterAsDeletingInjectable;
