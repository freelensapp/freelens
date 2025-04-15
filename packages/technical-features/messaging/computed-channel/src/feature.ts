import { getFeature } from "@freelensapp/feature-core";
import { messagingFeature } from "@freelensapp/messaging";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";

export const computedChannelFeature = getFeature({
  id: "computed-channel",

  dependencies: [messagingFeature],

  register: (di) => {
    autoRegister({
      di,
      targetModule: module,

      getRequireContexts: () => [require.context("./", true, /\.injectable\.(ts|tsx)$/)],
    });
  },
});
