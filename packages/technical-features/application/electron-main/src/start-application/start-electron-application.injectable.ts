import { startApplicationInjectionToken } from "@freelensapp/application";
import { runManySyncFor } from "@freelensapp/run-many";
import { createInstantiationTargetDecorator, getInjectable, instantiationDecoratorToken } from "@ogre-tools/injectable";
import { beforeAnythingInjectionToken, beforeElectronIsReadyInjectionToken } from "./time-slots";
import whenAppIsReadyInjectable from "./when-app-is-ready.injectable";

const startElectronApplicationInjectable = getInjectable({
  id: "start-electron-application",
  instantiate: () =>
    createInstantiationTargetDecorator({
      target: startApplicationInjectionToken,
      decorate: (targetInstantiate) => (di) => {
        const whenAppIsReady = di.inject(whenAppIsReadyInjectable);
        const runManySync = runManySyncFor(di);
        const beforeAnything = runManySync(beforeAnythingInjectionToken);
        const beforeElectronIsReady = runManySync(beforeElectronIsReadyInjectionToken);
        const startApplication = targetInstantiate(di);

        return () => {
          beforeAnything();
          beforeElectronIsReady();

          return (async () => {
            await whenAppIsReady();

            return startApplication();
          })();
        };
      },
    }),
  decorable: false,
  injectionToken: instantiationDecoratorToken,
});

export default startElectronApplicationInjectable;
