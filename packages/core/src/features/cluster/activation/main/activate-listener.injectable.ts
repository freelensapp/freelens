/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { activateClusterChannel } from "../common/channels";
import requestClusterActivationInjectable from "./request-activation.injectable";

const activateClusterRequestChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "activate-cluster-request-channel-listener",
  channel: activateClusterChannel,
  getHandler: (di) => di.inject(requestClusterActivationInjectable),
});

export default activateClusterRequestChannelListenerInjectable;
