/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import { casChannel } from "../common/channel";
import { globalAgent } from "https";
import { isString } from "@freelensapp/utilities";

const certificateAuthoritiesChannelListenerInjectable = getRequestChannelListenerInjectable({
  id: "certificate-authorities-channel-listener",
  channel: casChannel,
  getHandler: () => () => {
    if (Array.isArray(globalAgent.options.ca)) {
      return globalAgent.options.ca.filter(isString);
    }

    if (typeof globalAgent.options.ca === "string") {
      return [globalAgent.options.ca];
    }

    return [];
  },
});

export default certificateAuthoritiesChannelListenerInjectable;
