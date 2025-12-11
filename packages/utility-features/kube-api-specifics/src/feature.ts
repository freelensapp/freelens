import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const kubeApiSpecificsFeature = getFeature({
  id: "kube-api-specifics",
  register: (di) => {
    registerInjectables(di);
  },
});
