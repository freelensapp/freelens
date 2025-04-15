import { SendMessageToChannel, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { pipeline } from "@ogre-tools/fp";
import { getInjectable } from "@ogre-tools/injectable";
import type { WebContents } from "electron";
import { flatMap, reject } from "lodash/fp";
import frameIdsInjectable from "./frameIds.injectable";
import getWebContentsInjectable from "./get-web-contents.injectable";

const isDestroyed = (webContent: WebContents) => webContent.isDestroyed();
const isCrashed = (webContent: WebContents) => webContent.isCrashed();

const forEach =
  <T>(predicate: (item: T) => void) =>
  (items: T[]) =>
    items.forEach(predicate);

const sendMessageToChannelInjectable = getInjectable({
  id: "send-message-to-channel",

  instantiate: (di) => {
    const getWebContents = di.inject(getWebContentsInjectable);
    const frameIds = di.inject(frameIdsInjectable);

    return ((channel, message) => {
      pipeline(
        getWebContents(),
        reject(isDestroyed),
        reject(isCrashed),

        flatMap((webContent) => [
          (channelId: string, ...args: any[]) => webContent.send(channelId, ...args),

          ...[...frameIds].map(({ frameId, processId }) => (channelId: string, ...args: any[]) => {
            webContent.sendToFrame([processId, frameId], channelId, ...args);
          }),
        ]),

        forEach((send) => {
          send(channel.id, message);
        }),
      );
    }) as SendMessageToChannel;
  },

  injectionToken: sendMessageToChannelInjectionToken,
});

export default sendMessageToChannelInjectable;
