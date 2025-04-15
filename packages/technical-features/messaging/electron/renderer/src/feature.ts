import { getFeature } from "@freelensapp/feature-core";
import { messagingFeature } from "@freelensapp/messaging";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";

export const messagingFeatureForRenderer = getFeature({
  id: "messaging-for-renderer",

  register: (di) => {
    autoRegister({
      di,
      targetModule: module,

      getRequireContexts: () => [require.context("./", true, /\.injectable\.(ts|tsx)$/)],
    });
  },

  dependencies: [messagingFeature],
});
