import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const applicationFeature = getFeature({
  id: "application",

  register: (di) => {
    registerInjectables(di);
  },
});
