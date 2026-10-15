import { registerFeature } from "@freelensapp/feature-core";
import { getMessageChannel, sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { createContainer, DiContainer } from "@ogre-tools/injectable";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { messagingFeatureForMain } from "../feature";
import allowCommunicationListenerInjectable from "./allow-communication-listener.injectable";
import getWebContentsInjectable from "./get-web-contents.injectable";

import type { WebContents } from "electron";
import type { Mock } from "vitest";

const someChannel = getMessageChannel<string>("some-channel");

describe("send-message-to-channel", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, messagingFeatureForMain);
  });

  it("given no web contents, when sending a message, does not do anything", () => {
    di.override(getWebContentsInjectable, () => () => []);

    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    expect(() => sendMessageToChannel(someChannel, "some-message")).not.toThrow();
  });

  describe("given web content that is alive", () => {
    let sendToFrameMock: Mock;
    let sendMessageMock: Mock;

    beforeEach(() => {
      sendToFrameMock = vi.fn();
      sendMessageMock = vi.fn();

      di.override(getWebContentsInjectable, () => () => [
        {
          send: (...args: any[]) => sendMessageMock("first", ...args),
          sendToFrame: (...args: any[]) => sendToFrameMock("first", ...args),
          mainFrame: { processId: 10, routingId: 1 },
          isDestroyed: () => false,
          isCrashed: () => false,
        } as unknown as WebContents,
        {
          send: (...args: any[]) => sendMessageMock("second", ...args),
          sendToFrame: (...args: any[]) => sendToFrameMock("second", ...args),
          mainFrame: { processId: 20, routingId: 1 },
          isDestroyed: () => false,
          isCrashed: () => false,
        } as unknown as WebContents,
      ]);
    });

    it("when sending message, sends the message to webcontents", () => {
      const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

      sendMessageToChannel(someChannel, "some-message");

      expect(sendMessageMock.mock.calls).toEqual([
        ["first", "some-channel", "some-message"],
        ["second", "some-channel", "some-message"],
      ]);
    });

    describe("when multiple renderers inform that they are ready to listen messages", () => {
      beforeEach(() => {
        const allowCommunicationListener = di.inject(allowCommunicationListenerInjectable);

        allowCommunicationListener.handler(undefined, { frameId: 42, processId: 126 });
        allowCommunicationListener.handler(undefined, { frameId: 84, processId: 168 });
      });

      describe("when sending a message", () => {
        beforeEach(() => {
          const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

          sendMessageToChannel(someChannel, "some-message");
        });

        it("sends the message to webcontents", () => {
          expect(sendMessageMock.mock.calls).toEqual([
            ["first", "some-channel", "some-message"],
            ["second", "some-channel", "some-message"],
          ]);
        });

        it("sends the message to individual frames in webcontents", () => {
          expect(sendToFrameMock.mock.calls).toEqual([
            ["first", [126, 42], "some-channel", "some-message"],
            ["first", [168, 84], "some-channel", "some-message"],

            ["second", [126, 42], "some-channel", "some-message"],
            ["second", [168, 84], "some-channel", "some-message"],
          ]);
        });
      });
    });

    describe("when the main frame of a web contents informs that it is ready to listen messages", () => {
      beforeEach(() => {
        const allowCommunicationListener = di.inject(allowCommunicationListenerInjectable);

        allowCommunicationListener.handler(undefined, { frameId: 1, processId: 10 });
      });

      describe("when sending a message", () => {
        beforeEach(() => {
          const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

          sendMessageToChannel(someChannel, "some-message");
        });

        it("sends the message to the main frame through its web contents", () => {
          expect(sendMessageMock.mock.calls).toContainEqual(["first", "some-channel", "some-message"]);
        });

        it("does not send the message to the main frame again as an individual frame of its web contents", () => {
          expect(sendToFrameMock.mock.calls).not.toContainEqual(["first", [10, 1], "some-channel", "some-message"]);
        });
      });

      describe("given a subframe of the same web contents also informs that it is ready, when sending a message", () => {
        beforeEach(() => {
          const allowCommunicationListener = di.inject(allowCommunicationListenerInjectable);

          allowCommunicationListener.handler(undefined, { frameId: 2, processId: 11 });

          const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

          sendMessageToChannel(someChannel, "some-message");
        });

        it("sends the message to the subframe as an individual frame", () => {
          expect(sendToFrameMock.mock.calls).toContainEqual(["first", [11, 2], "some-channel", "some-message"]);
        });

        it("does not send the message to the main frame as an individual frame", () => {
          expect(sendToFrameMock.mock.calls).not.toContainEqual(["first", [10, 1], "some-channel", "some-message"]);
        });
      });
    });

    describe("when the same renderer informs twice that it is ready to listen messages, when sending a message", () => {
      beforeEach(() => {
        const allowCommunicationListener = di.inject(allowCommunicationListenerInjectable);

        allowCommunicationListener.handler(undefined, { frameId: 42, processId: 126 });
        allowCommunicationListener.handler(undefined, { frameId: 42, processId: 126 });

        const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

        sendMessageToChannel(someChannel, "some-message");
      });

      it("sends the message to the frame once in each web contents", () => {
        expect(sendToFrameMock.mock.calls).toEqual([
          ["first", [126, 42], "some-channel", "some-message"],
          ["second", [126, 42], "some-channel", "some-message"],
        ]);
      });
    });
  });

  it("given non alive web contents, when sending a message, does not send messages", () => {
    const sendToWebContentsMock = vi.fn();

    di.override(getWebContentsInjectable, () => () => [
      {
        send: sendToWebContentsMock,
        isDestroyed: () => true,
        isCrashed: () => false,
      } as unknown as WebContents,

      {
        send: sendToWebContentsMock,
        isDestroyed: () => false,
        isCrashed: () => true,
      } as unknown as WebContents,
    ]);

    const sendMessageToChannel = di.inject(sendMessageToChannelInjectionToken);

    sendMessageToChannel(someChannel, "irrelevant");

    expect(sendToWebContentsMock).not.toHaveBeenCalled();
  });
});
