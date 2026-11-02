import { SendMessageToChannel, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { getInjectable } from "@ogre-tools/injectable";
import frameIdsInjectable from "./frameIds.injectable";
import getWebContentsInjectable from "./get-web-contents.injectable";

import type { WebContents } from "electron";

import type { FrameId } from "./frameIds.injectable";

const isDestroyed = (webContent: WebContents) => webContent.isDestroyed();
const isCrashed = (webContent: WebContents) => webContent.isCrashed();

// webContent.send() already delivers to the main frame, which registers itself like any other frame
const isMainFrameOf = (webContent: WebContents, { frameId, processId }: FrameId) =>
  webContent.mainFrame.processId === processId && webContent.mainFrame.routingId === frameId;

const sendMessageToChannelInjectable = getInjectable({
  id: "send-message-to-channel",

  instantiate: (di) => {
    const getWebContents = di.inject(getWebContentsInjectable);
    const frameIds = di.inject(frameIdsInjectable);

    return ((channel, message) => {
      getWebContents()
        .filter((webContent) => !isDestroyed(webContent))
        .filter((webContent) => !isCrashed(webContent))
        .flatMap((webContent) => [
          (channelId: string, ...args: any[]) => webContent.send(channelId, ...args),

          ...[...frameIds.values()]
            .filter((frame) => !isMainFrameOf(webContent, frame))
            .map(({ frameId, processId }) => (channelId: string, ...args: any[]) => {
              webContent.sendToFrame([processId, frameId], channelId, ...args);
            }),
        ])
        .forEach((send) => {
          send(channel.id, message);
        });
    }) as SendMessageToChannel;
  },

  injectionToken: sendMessageToChannelInjectionToken,
});

export default sendMessageToChannelInjectable;
