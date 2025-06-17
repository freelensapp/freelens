import whenAppIsReadyInjectable from "../start-application/when-app-is-ready.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

export const overrideSideEffectsWithFakes = (di: DiContainer) => {
  di.override(whenAppIsReadyInjectable, () => () => Promise.resolve());
};
