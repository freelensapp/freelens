/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import UbuntuMono from "./UbuntuMonoNerdFont-Regular.ttf";
import { terminalFontInjectionToken } from "./token";

const ubuntuMonoTerminalFontInjectable = getInjectable({
  id: "ubuntu-mono-terminal-font",
  instantiate: () => ({
    name: "UbuntuMono",
    alias: "Ubuntu Mono",
    url: UbuntuMono,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default ubuntuMonoTerminalFontInjectable;
