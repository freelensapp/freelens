import { getFeature } from "@freelens/feature-core";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";

export const loggerFeature = getFeature({
  id: "logger-feature",

  register: (di) => {
    autoRegister({
      di,
      targetModule: module,
      getRequireContexts: () => [
        require.context("./", true, /\.injectable\.(ts|tsx)$/),
      ],
    });
  },
});
