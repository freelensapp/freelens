import { getFeature } from "@freelensapp/feature-core";
import { messagingFeature } from "../actual/feature";
import { registerInjectables } from "./register-injectables";

export const messagingFeatureForUnitTesting = getFeature({
  id: "messaging-for-unit-testing",

  dependencies: [messagingFeature],

  register: (di) => {
    registerInjectables(di);
  },
});
