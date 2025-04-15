import { runManyFor } from "@freelensapp/run-many";
import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import * as timeSlots from "./time-slots";

export type StartApplication = () => Promise<void>;

export const startApplicationInjectionToken = getInjectionToken<StartApplication>({
  id: "start-application-injection-token",
});

const startApplicationInjectable = getInjectable({
  id: "start-application",

  instantiate: (di): StartApplication => {
    const runManyAsync = runManyFor(di);
    const beforeApplicationIsLoading = runManyAsync(timeSlots.beforeApplicationIsLoadingInjectionToken);
    const onLoadOfApplication = runManyAsync(timeSlots.onLoadOfApplicationInjectionToken);
    const afterApplicationIsLoaded = runManyAsync(timeSlots.afterApplicationIsLoadedInjectionToken);

    return async () => {
      await beforeApplicationIsLoading();
      await onLoadOfApplication();
      await afterApplicationIsLoaded();
    };
  },

  injectionToken: startApplicationInjectionToken,
});

export default startApplicationInjectable;
