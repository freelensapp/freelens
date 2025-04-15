import { reactApplicationHigherOrderComponentInjectionToken } from "@freelensapp/react-application";
import { getInjectable } from "@ogre-tools/injectable";
import { KeyboardShortcutListener } from "./keyboard-shortcut-listener";

export const keyboardShortcutListenerReactApplicationHocInjectable = getInjectable({
  id: "keyboard-shortcut-listener-react-application-hoc",
  instantiate: () => KeyboardShortcutListener,

  injectionToken: reactApplicationHigherOrderComponentInjectionToken,
});
