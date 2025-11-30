/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { executeOnClusterChannel } from "../common/channels";
import executeOnClusterHandlerInjectable from "./execute-handler.injectable";

/**
 * IPC channel listener for execute-on-cluster requests.
 * Bridges renderer process requests to main process handler.
 */
const executeOnClusterListenerInjectable = getRequestChannelListenerInjectable({
  id: "execute-on-cluster-channel-listener",
  channel: executeOnClusterChannel,
  getHandler: (di) => di.inject(executeOnClusterHandlerInjectable),
});

export default executeOnClusterListenerInjectable;
