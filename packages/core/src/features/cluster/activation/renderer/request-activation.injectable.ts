/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { activateClusterChannel } from "../common/channels";
import { requestClusterActivationInjectionToken } from "../common/request-token";

const requestClusterActivationInjectable = getInjectable({
  id: "request-cluster-activation",
  instantiate: (di) => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (req) => requestFromChannel(activateClusterChannel, req);
  },
  injectionToken: requestClusterActivationInjectionToken,
});

export default requestClusterActivationInjectable;
