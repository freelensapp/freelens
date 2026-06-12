import { registerFeature } from "@freelensapp/feature-core";
import { createContainer, DiContainer } from "@ogre-tools/injectable";
import { ipcMain } from "electron";
import { messagingFeatureForMain } from "../feature";
import ipcMainInjectable from "./ipc-main.injectable";

describe("ipc-main", () => {
  let di: DiContainer;

  beforeEach(() => {
    di = createContainer("irrelevant");

    registerFeature(di, messagingFeatureForMain);
  });

  it("is the actual IPC-main of Electron", () => {
    const actual = di.inject(ipcMainInjectable);

    expect(actual).toBe(ipcMain);
  });
});
