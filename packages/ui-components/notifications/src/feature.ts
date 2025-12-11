import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const notificationsFeature = getFeature({
  id: "notifications-feature",

  register: (di) => {
    registerInjectables(di);
  },
});
