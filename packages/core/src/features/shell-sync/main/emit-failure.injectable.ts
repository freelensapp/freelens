/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { shellSyncFailedChannel } from "../common/failure-channel";

const emitShellSyncFailedInjectable = getInjectable({
  id: "emit-shell-sync-failed",
  instantiate: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return (error: string) => sendMessageToChannel(shellSyncFailedChannel, error);
  },
});

export default emitShellSyncFailedInjectable;
