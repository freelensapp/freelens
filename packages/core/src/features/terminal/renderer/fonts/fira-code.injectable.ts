/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import FiraCode from "./FiraCodeNerdFont-Regular.ttf";
import { terminalFontInjectionToken } from "./token";

const firaCodeTerminalFontInjectable = getInjectable({
  id: "fira-code-terminal-font",
  instantiate: () => ({
    name: "FiraCode",
    url: FiraCode,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default firaCodeTerminalFontInjectable;
