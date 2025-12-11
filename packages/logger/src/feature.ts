import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const loggerFeature = getFeature({
  id: "logger-feature",

  register: (di) => {
    registerInjectables(di);
  },
});
