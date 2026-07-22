import { startApplicationInjectionToken } from "@freelensapp/application";
import { runManySyncFor } from "@freelensapp/run-many";
import { getInjectable2, instantiationDecoratorToken } from "@ogre-tools/injectable";
import { beforeAnythingInjectionToken, beforeElectronIsReadyInjectionToken } from "./time-slots";
import whenAppIsReadyInjectable from "./when-app-is-ready.injectable";

const startElectronApplicationInjectable = getInjectable2({
  id: "start-electron-application",
  instantiate: () => () => (targetInstantiate) => (di) => {
    const whenAppIsReady = di.inject(whenAppIsReadyInjectable);
    const runManySync = runManySyncFor(di);
    const beforeAnything = runManySync(beforeAnythingInjectionToken);
    const beforeElectronIsReady = runManySync(beforeElectronIsReadyInjectionToken);
    const startApplication = targetInstantiate(di, undefined);

    return () => {
      beforeAnything();
      beforeElectronIsReady();

      return (async () => {
        await whenAppIsReady();

        return startApplication();
      })();
    };
  },
  injectionToken: instantiationDecoratorToken.for(startApplicationInjectionToken),
});

export default startElectronApplicationInjectable;
