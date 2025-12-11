import { applicationFeature } from "@freelensapp/application";
import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const messagingFeature = getFeature({
  id: "messaging",

  dependencies: [applicationFeature],

  register: (di) => {
    registerInjectables(di);
  },
});
