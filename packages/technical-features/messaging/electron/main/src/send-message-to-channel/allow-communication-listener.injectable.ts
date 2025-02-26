import { getMessageChannel, getMessageChannelListenerInjectable } from "@freelensapp/messaging";
import frameIdsInjectable from "./frameIds.injectable";

const frameCommunicationAdminChannel = getMessageChannel<undefined>("frame-communication-admin-channel");

const allowCommunicationListenerInjectable = getMessageChannelListenerInjectable({
  id: "allow-communication",
  channel: frameCommunicationAdminChannel,

  getHandler: (di) => {
    const frameIds = di.inject(frameIdsInjectable);

    return (_, data) => {
      if (data) {
        const { frameId, processId } = data;

        frameIds.add({ frameId, processId });
      }
    };
  },
});

export default allowCommunicationListenerInjectable;
