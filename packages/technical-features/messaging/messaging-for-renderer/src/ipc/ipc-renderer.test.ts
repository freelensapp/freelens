import { registerFeature } from "@freelensapp/feature-core";
import { createContainer, DiContainer } from "@ogre-tools/injectable";
import { ipcRenderer } from "electron";
import { messagingFeatureForRenderer } from "../feature";
import ipcRendererInjectable from "./ipc-renderer.injectable";

describe("ipc-renderer", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, messagingFeatureForRenderer);
  });

  it("is not undefined", () => {
    const actual = di.inject(ipcRendererInjectable);

    expect(actual).not.toBeUndefined();
  });

  it("is IPC-renderer of Electron", () => {
    const actual = di.inject(ipcRendererInjectable);

    expect(actual).toBe(ipcRenderer);
  });
});
