/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import clustersThatAreBeingDeletedInjectable from "../../../../main/cluster/are-being-deleted.injectable";
import { clearClusterAsDeletingChannel } from "../common/clear-as-deleting-channel";

const clearClusterAsDeletingChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "clear-cluster-as-deleting-channel-listener",
  channel: clearClusterAsDeletingChannel,
  getHandler: (di) => {
    const clustersThatAreBeingDeleted = di.inject(clustersThatAreBeingDeletedInjectable);

    return (clusterId) => {
      clustersThatAreBeingDeleted.delete(clusterId);
    };
  },
});

export default clearClusterAsDeletingChannelListenerInjectable;
