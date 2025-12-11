import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const routingFeature = getFeature({
  id: "routing",

  register: (di) => {
    registerInjectables(di);
  },
});
