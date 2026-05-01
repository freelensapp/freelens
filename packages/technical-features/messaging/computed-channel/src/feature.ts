import { getFeature } from "@freelensapp/feature-core";
import { messagingFeature } from "@freelensapp/messaging";
import { registerInjectables } from "./register-injectables";
export const computedChannelFeature = getFeature({
  id: "computed-channel",

  dependencies: [messagingFeature],

  register: (di) => {
    registerInjectables(di);
  },
});
