import { registerFeature } from "@freelensapp/feature-core";
import { createContainer } from "@ogre-tools/injectable";
import { app } from "electron";
import { applicationFeatureForElectronMain } from "../feature";
import electronAppInjectable from "./electron-app.injectable";

describe("electron-app", () => {
  it("is electron app", () => {
    const di = createContainer("irrelevant");
    // ogre 23 prevents side-effect injectables by default; this test injects real ones.
    di.permitSideEffects();

    registerFeature(di, applicationFeatureForElectronMain);

    const actual = di.inject(electronAppInjectable);

    expect(actual).toBe(app);
  });
});
