/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { credentialsChannel } from "../common/channel";
import credentialHandlerInjectable from "./credential-handler.injectable";

const credentialChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "credential-channel-listener",
  channel: credentialsChannel,
  getHandler: (di) => di.inject(credentialHandlerInjectable),
});

export default credentialChannelListenerInjectable;
