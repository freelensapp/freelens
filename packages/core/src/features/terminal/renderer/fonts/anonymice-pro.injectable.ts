/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { terminalFontInjectionToken } from "./token";
import AnonymicePro from "./AnonymiceProNerdFont-Regular.ttf";

const anonymiceProTerminalFontInjectable = getInjectable({
  id: "anonymice-pro-terminal-font",
  instantiate: () => ({
    name:"AnonymicePro",
    url: AnonymicePro,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default anonymiceProTerminalFontInjectable;
