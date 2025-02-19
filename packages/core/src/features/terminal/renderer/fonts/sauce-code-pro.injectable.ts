/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { terminalFontInjectionToken } from "./token";
import SauceCodePro from "./SauceCodeProNerdFont-Regular.ttf";

const sauceCodeProTerminalFontInjectable = getInjectable({
  id: "sauce-code-pro-terminal-font",
  instantiate: () => ({
    name: "SauceCodePro",
    alias: "Source Code Pro",
    url: SauceCodePro,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default sauceCodeProTerminalFontInjectable;
