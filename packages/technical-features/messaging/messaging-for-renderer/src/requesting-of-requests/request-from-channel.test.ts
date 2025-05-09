import type { AsyncFnMock } from "@async-fn/jest";
import asyncFn from "@async-fn/jest";
import { registerFeature } from "@freelensapp/feature-core";
import { requestFromChannelInjectionToken } from "@freelensapp/messaging";
import type { RequestChannel } from "@freelensapp/messaging";
import { DiContainer, createContainer } from "@ogre-tools/injectable";
import { messagingFeatureForRenderer } from "../feature";
import invokeIpcInjectable from "./invoke-ipc.injectable";

describe("request-from-channel", () => {
  let di: DiContainer;
  let invokeIpcMock: AsyncFnMock<() => Promise<number>>;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, messagingFeatureForRenderer);

    invokeIpcMock = asyncFn();
    di.override(invokeIpcInjectable, () => invokeIpcMock);
  });

  describe("when called", () => {
    let actualPromise: Promise<number>;

    beforeEach(() => {
      const requestFromChannel = di.inject(requestFromChannelInjectionToken);

      const someChannel: RequestChannel<string, number> = {
        id: "some-channel-id",
      };

      actualPromise = requestFromChannel(someChannel, "some-request-payload");
    });

    it("invokes ipcRenderer of Electron", () => {
      expect(invokeIpcMock).toHaveBeenCalledWith("some-channel-id", "some-request-payload");
    });

    it("when invoke resolves with response, resolves with said response", async () => {
      await invokeIpcMock.resolve(42);

      expect(await actualPromise).toBe(42);
    });
  });
});
