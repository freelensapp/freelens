/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { terminalFontInjectionToken } from "./token";
import FiraCode from "./FiraCodeNerdFont-Regular.ttf";

const firaCodeTerminalFontInjectable = getInjectable({
  id: "fira-code-terminal-font",
  instantiate: () => ({
    name:"FiraCode",
    url: FiraCode,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default firaCodeTerminalFontInjectable;
