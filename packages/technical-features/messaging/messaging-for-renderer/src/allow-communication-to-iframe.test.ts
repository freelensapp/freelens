import { startApplicationInjectionToken } from "@freelensapp/application";
import { registerFeature } from "@freelensapp/feature-core";
import { sendMessageToChannelInjectionToken } from "@freelensapp/messaging";
import { createContainer, DiContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { runInAction } from "mobx";
import { frameCommunicationAdminChannel } from "./allow-communication-to-iframe.injectable";
import { messagingFeatureForRenderer } from "./feature";
import ipcRendererInjectable from "./ipc/ipc-renderer.injectable";

describe("allow communication to iframe", () => {
  let di: DiContainer;
  let sendMessageToChannelMock: jest.Mock;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerMobX(di);

    runInAction(() => {
      registerFeature(di, messagingFeatureForRenderer);
    });

    di.override(ipcRendererInjectable, () => ({ on: () => {} }) as unknown);

    sendMessageToChannelMock = jest.fn();
    di.override(sendMessageToChannelInjectionToken, () => sendMessageToChannelMock);
  });

  it("when application starts, sends message to communication channel to register the frame ID and process ID for further usage", async () => {
    await di.inject(startApplicationInjectionToken)();

    expect(sendMessageToChannelMock).toHaveBeenCalledWith(frameCommunicationAdminChannel);
  });
});
