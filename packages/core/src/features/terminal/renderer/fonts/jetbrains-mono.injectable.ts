/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import JetBrainsMono from "./JetBrainsMonoNerdFont-Regular.ttf";
import { terminalFontInjectionToken } from "./token";

const jetbrainsMonoTerminalFontInjectable = getInjectable({
  id: "jetbrains-mono-terminal-font",
  instantiate: () => ({
    name: "JetBrainsMono",
    alias: "JetBrains Mono",
    url: JetBrainsMono,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default jetbrainsMonoTerminalFontInjectable;
