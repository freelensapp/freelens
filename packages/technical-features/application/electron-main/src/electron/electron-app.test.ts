import { registerFeature } from "@freelensapp/feature-core";
import { createContainer } from "@ogre-tools/injectable";
import { app } from "electron";
import { applicationFeatureForElectronMain } from "../feature";
import electronAppInjectable from "./electron-app.injectable";

describe("electron-app", () => {
  it("is electron app", () => {
    const di = createContainer("irrelevant");

    registerFeature(di, applicationFeatureForElectronMain);

    const actual = di.inject(electronAppInjectable);

    expect(actual).toBe(app);
  });
});
