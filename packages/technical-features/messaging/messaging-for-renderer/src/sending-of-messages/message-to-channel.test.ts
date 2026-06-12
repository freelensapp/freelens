import asyncFn from "@async-fn/jest";
import { registerFeature } from "@freelensapp/feature-core";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { createContainer, DiContainer } from "@ogre-tools/injectable";
import { messagingFeatureForRenderer } from "../feature";
import sendToIpcInjectable from "./send-to-ipc.injectable";

import type { MessageChannel } from "@freelensapp/messaging";

import type { AsyncFnMock } from "@async-fn/jest";

describe("message-from-channel", () => {
  let di: DiContainer;
  let sendToIpcMock: AsyncFnMock<() => Promise<number>>;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, messagingFeatureForRenderer);

    sendToIpcMock = asyncFn();
    di.override(sendToIpcInjectable, () => sendToIpcMock);
  });

  describe("when called", () => {
    beforeEach(() => {
      const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

      const someChannel: MessageChannel<number> = {
        id: "some-channel-id",
      };

      sendMessageToChannel(someChannel, 42);
    });

    it("sends to ipcRenderer of Electron", () => {
      expect(sendToIpcMock).toHaveBeenCalledWith("some-channel-id", 42);
    });
  });
});
