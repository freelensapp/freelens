import { applicationFeature } from "@freelensapp/application";
import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const applicationFeatureForElectronMain = getFeature({
  id: "application-for-electron-main",

  register: (di) => {
    registerInjectables(di);
  },

  dependencies: [applicationFeature],
});
