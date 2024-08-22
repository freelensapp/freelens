import { getInjectable } from "@ogre-tools/injectable";
import type { RequestFromChannel } from "@freelens/messaging";
import { requestFromChannelInjectionToken } from "@freelens/messaging";
import invokeIpcInjectable from "./invoke-ipc.injectable";

const requestFromChannelInjectable = getInjectable({
  id: "request-from-channel",

  instantiate: (di) => {
    const invokeIpc = di.inject(invokeIpcInjectable);

    return ((channel, request) => invokeIpc(channel.id, request)) as RequestFromChannel;
  },

  injectionToken: requestFromChannelInjectionToken,
});

export default requestFromChannelInjectable;
