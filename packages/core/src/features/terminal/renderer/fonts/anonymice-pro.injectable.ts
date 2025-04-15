/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import AnonymicePro from "./AnonymiceProNerdFont-Regular.ttf";
import { terminalFontInjectionToken } from "./token";

const anonymiceProTerminalFontInjectable = getInjectable({
  id: "anonymice-pro-terminal-font",
  instantiate: () => ({
    name: "AnonymicePro",
    alias: "Anonymous Pro",
    url: AnonymicePro,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default anonymiceProTerminalFontInjectable;
