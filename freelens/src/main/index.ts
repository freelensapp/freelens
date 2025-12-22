import { applicationFeature, startApplicationInjectionToken } from "@freelensapp/application";
import { applicationFeatureForElectronMain } from "@freelensapp/application-for-electron-main";
import { commonExtensionApi as Common, mainExtensionApi as Main, registerLensCore } from "@freelensapp/core/main";
import { registerFeature } from "@freelensapp/feature-core";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { loggerFeature } from "@freelensapp/logger";
import { messagingFeatureForMain } from "@freelensapp/messaging-for-main";
import { prometheusFeature } from "@freelensapp/prometheus";
import { randomFeature } from "@freelensapp/random";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { runInAction } from "mobx";
import { registerInjectables as registerCommonInjectables } from "../common/register-injectables";
import { registerInjectables as registerMainInjectables } from "./register-injectables";

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

  registerMainInjectables(di);
  registerCommonInjectables(di);
});

const startApplication = di.inject(startApplicationInjectionToken);

startApplication().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {
  Mobx,
  Pty,
} from "@freelensapp/core/main";

export const LensExtensions = {
  Main,
  Common,
};
