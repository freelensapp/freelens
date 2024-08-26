import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";
import { runInAction } from "mobx";
import {
  mainExtensionApi as Main,
  commonExtensionApi as Common,
  registerLensCore,
} from "@freelensapp/core/main";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { registerFeature } from "@freelensapp/feature-core";
import { applicationFeature, startApplicationInjectionToken } from '@freelensapp/application'
import { applicationFeatureForElectronMain } from '@freelensapp/application-for-electron-main'
import { messagingFeatureForMain } from "@freelensapp/messaging-for-main";
import { loggerFeature } from "@freelensapp/logger";
import { randomFeature } from "@freelensapp/random";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { prometheusFeature } from "@freelensapp/prometheus";

const environment = "main";

const di = createContainer(environment, {
  detectCycles: false,
});

registerMobX(di);

runInAction(() => {
  registerLensCore(di, environment);

  registerFeature(
    di,
    loggerFeature,
    prometheusFeature,
    applicationFeature,
    applicationFeatureForElectronMain,
    messagingFeatureForMain,
    randomFeature,
    kubeApiSpecificsFeature,
  );

  try {
    autoRegister({
      di,
      targetModule: module,
      getRequireContexts: () => [
        require.context("./", true, CONTEXT_MATCHER_FOR_NON_FEATURES),
        require.context("../common", true, CONTEXT_MATCHER_FOR_NON_FEATURES),
      ],
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

const startApplication = di.inject(startApplicationInjectionToken);

startApplication().catch((error) => {
  console.error(error);
  process.exit(1);
})

export {
  Mobx,
  Pty,
} from "@freelensapp/core/main";

export const LensExtensions = {
  Main,
  Common,
}
