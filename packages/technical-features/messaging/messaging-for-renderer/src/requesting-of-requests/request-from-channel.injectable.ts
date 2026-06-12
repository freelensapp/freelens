import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import invokeIpcInjectable from "./invoke-ipc.injectable";

import type { RequestFromChannel } from "@freelensapp/messaging";

const requestFromChannelInjectable = getInjectable({
  id: "request-from-channel",

  instantiate: (di) => {
    const invokeIpc = di.inject(invokeIpcInjectable);

    return ((channel, request) => invokeIpc(channel.id, request)) as RequestFromChannel;
  },

  injectionToken: requestFromChannelInjectionToken,
});

export default requestFromChannelInjectable;
