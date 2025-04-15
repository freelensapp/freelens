/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import BlexMono from "./BlexMonoNerdFont-Regular.ttf";
import { terminalFontInjectionToken } from "./token";

const blexMonoTerminalFontInjectable = getInjectable({
  id: "blex-mono-terminal-font",
  instantiate: () => ({
    name: "BlexMono",
    alias: "IBM Plex Mono",
    url: BlexMono,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default blexMonoTerminalFontInjectable;
