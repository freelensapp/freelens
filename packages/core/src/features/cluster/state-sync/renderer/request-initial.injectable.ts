/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { initialClusterStatesChannel } from "../common/channels";

import type { RequestChannelHandler } from "@freelensapp/messaging";

export type RequestInitialClusterStates = RequestChannelHandler<typeof initialClusterStatesChannel>;

const requestInitialClusterStatesInjectable = getInjectable({
  id: "request-initial-cluster-states",
  instantiate: (di): RequestInitialClusterStates => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return () => requestFromChannel(initialClusterStatesChannel);
  },
});

export default requestInitialClusterStatesInjectable;
