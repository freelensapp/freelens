import { getFeature } from "@freelensapp/feature-core";
import { messagingFeature } from "@freelensapp/messaging";
import { registerInjectables } from "./register-injectables";
export const messagingFeatureForRenderer = getFeature({
  id: "messaging-for-renderer",

  register: (di) => {
    registerInjectables(di);
  },

  dependencies: [messagingFeature],
});
