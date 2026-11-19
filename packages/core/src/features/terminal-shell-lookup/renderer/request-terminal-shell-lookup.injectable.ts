/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import { lookUpTerminalShellChannel } from "../common/channels";

import type { ChannelRequester } from "@freelensapp/messaging";

export type RequestTerminalShellLookup = ChannelRequester<typeof lookUpTerminalShellChannel>;

const requestTerminalShellLookupInjectable = getInjectable({
  id: "request-terminal-shell-lookup",
  instantiate: (di): RequestTerminalShellLookup => {
    const requestFromChannel = di.inject(requestFromChannelInjectionToken);

    return (setting) => requestFromChannel(lookUpTerminalShellChannel, setting);
  },
});

export default requestTerminalShellLookupInjectable;
