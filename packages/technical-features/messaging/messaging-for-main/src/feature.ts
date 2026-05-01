import { getFeature } from "@freelensapp/feature-core";
import { messagingFeature } from "@freelensapp/messaging";
import { registerInjectables } from "./register-injectables";
export const messagingFeatureForMain = getFeature({
  id: "messaging-for-main",

  register: (di) => {
    registerInjectables(di);
  },

  dependencies: [messagingFeature],
});
