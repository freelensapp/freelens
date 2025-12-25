import { applicationFeature } from "@freelensapp/application";
import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const reactApplicationFeature = getFeature({
  id: "react-application",

  register: (di) => {
    registerInjectables(di);
  },

  dependencies: [applicationFeature],
});
