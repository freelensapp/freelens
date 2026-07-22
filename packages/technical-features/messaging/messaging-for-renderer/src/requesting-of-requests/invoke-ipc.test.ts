import { registerFeature } from "@freelensapp/feature-core";
import { createContainer, DiContainer } from "@ogre-tools/injectable";
import { ipcRenderer } from "electron";
import { messagingFeatureForRenderer } from "../feature";
import invokeIpcInjectable from "./invoke-ipc.injectable";

describe("ipc-renderer", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = createContainer("irrelevant");
    // ogre 23 prevents side-effect injectables by default; this test injects real ones.
    di.permitSideEffects();

    registerFeature(di, messagingFeatureForRenderer);
  });

  it("is IPC-renderer invoke of Electron", () => {
    const actual = di.inject(invokeIpcInjectable);

    expect(actual).toBe(ipcRenderer.invoke);
  });
});
