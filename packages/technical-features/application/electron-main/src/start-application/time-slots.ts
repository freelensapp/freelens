import type { RunnableSync } from "@freelensapp/run-many";
import { getInjectionToken } from "@ogre-tools/injectable";

export const beforeAnythingInjectionToken = getInjectionToken<RunnableSync>({
  id: "before-anything",
});

export const beforeElectronIsReadyInjectionToken = getInjectionToken<RunnableSync>({
  id: "before-electron-is-ready-injection-token",
});
