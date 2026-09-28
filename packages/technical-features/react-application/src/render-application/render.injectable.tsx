import { getInjectable, getInjectionToken } from "@ogre-tools/injectable";
import reactRootInjectable from "./react-root.injectable";

import type React from "react";

export type Render = (application: React.ReactElement) => void;

export const renderInjectionToken = getInjectionToken<Render>({
  id: "render-injection-token",
});

const renderInjectable = getInjectable({
  id: "render",

  /* c8 ignore start */
  instantiate: (di) => {
    const reactRoot = di.inject(reactRootInjectable);

    return (application) => {
      const container = document.getElementById("app");

      if (container) {
        reactRoot.render(container, application);
      }
    };
  },
  /* c8 ignore stop */

  causesSideEffects: true,

  injectionToken: renderInjectionToken,
});

export default renderInjectable;
