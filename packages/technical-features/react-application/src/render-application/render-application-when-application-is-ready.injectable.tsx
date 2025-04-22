import { afterApplicationIsLoadedInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import React from "react";
import { ReactApplication } from "../react-application/react-application";
import renderInjectable from "./render.injectable";

export const renderApplicationWhenApplicationIsReadyInjectable = getInjectable({
  id: "render-application-when-application-is-ready",

  instantiate: (di) => {
    const render = di.inject(renderInjectable);

    return {
      run: () => {
        render(<ReactApplication di={di} />);
      },
    };
  },

  injectionToken: afterApplicationIsLoadedInjectionToken,
});
