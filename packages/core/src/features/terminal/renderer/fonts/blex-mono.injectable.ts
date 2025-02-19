/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { terminalFontInjectionToken } from "./token";
import BlexMono from "./BlexMonoNerdFont-Regular.ttf";

const blexMonoTerminalFontInjectable = getInjectable({
  id: "blex-mono-terminal-font",
  instantiate: () => ({
    name: "BlexMono",
    url: BlexMono,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default blexMonoTerminalFontInjectable;
