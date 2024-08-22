import { getInjectable } from "@ogre-tools/injectable";
import { onLoadOfApplicationInjectionToken } from "@freelens/application";
import { getMessageChannel, sendMessageToChannelInjectionToken } from "@freelens/messaging";

export const frameCommunicationAdminChannel = getMessageChannel<undefined>("frame-communication-admin-channel");

const allowCommunicationToIframeInjectable = getInjectable({
  id: "allow-communication-to-iframe-injectable",

  instantiate: (di) => {
    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    return {
      run: () => {
        sendMessageToChannel(frameCommunicationAdminChannel);
      },
    };
  },

  injectionToken: onLoadOfApplicationInjectionToken,
});

export default allowCommunicationToIframeInjectable;
