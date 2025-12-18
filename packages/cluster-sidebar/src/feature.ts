import { getFeature } from "@freelensapp/feature-core";
import { registerInjectables } from "./register-injectables";
export const clusterSidebarFeature = getFeature({
  id: "cluster-side-feature",

  register: (di) => {
    registerInjectables(di);
  },
});
