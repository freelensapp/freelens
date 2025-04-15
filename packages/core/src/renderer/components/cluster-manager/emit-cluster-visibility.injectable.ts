/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import type { ClusterId } from "../../../common/cluster-types";
import { clusterVisibilityChannel } from "../../../common/cluster/visibility-channel";

const emitClusterVisibilityInjectable = getInjectable({
  id: "emit-cluster-visibility",
  instantiate: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return (id: ClusterId | null) => sendMessageToChannel(clusterVisibilityChannel, id);
  },
});

export default emitClusterVisibilityInjectable;
