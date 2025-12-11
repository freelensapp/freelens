import { applicationFeature } from "@freelensapp/application";
import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const prometheusFeature = getFeature({
  id: "prometheus",

  register: (di) => {
    registerInjectables(di);
  },

  dependencies: [applicationFeature],
});
