import { getFeature } from "@freelensapp/feature-core";
import { reactApplicationFeature } from "@freelensapp/react-application";
import { registerInjectables } from "./register-injectables";
export const keyboardShortcutsFeature = getFeature({
  id: "keyboard-shortcuts",

  register: (di) => {
    registerInjectables(di);
  },

  dependencies: [reactApplicationFeature],
});
