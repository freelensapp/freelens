import { getFeature } from "@freelensapp/feature-core";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";
import { applicationFeature } from "@freelensapp/application";

export const prometheusFeature = getFeature({
  id: "prometheus",

  register: (di) => {
    autoRegister({
      di,
      targetModule: module,
      getRequireContexts: () => [require.context("./", true, /\.injectable\.(ts|tsx)$/)],
    });
  },

  dependencies: [applicationFeature],
});
