import { registerFeature } from "@freelensapp/feature-core";
import { DiContainer, createContainer } from "@ogre-tools/injectable";
import { ipcRenderer } from "electron";
import { messagingFeatureForRenderer } from "../feature";
import invokeIpcInjectable from "./invoke-ipc.injectable";

describe("ipc-renderer", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, messagingFeatureForRenderer);
  });

  it("is IPC-renderer invoke of Electron", () => {
    const actual = di.inject(invokeIpcInjectable);

    expect(actual).toBe(ipcRenderer.invoke);
  });
});
