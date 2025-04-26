/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import RedHatMono from "./RedHatMono-Regular.ttf";
import { terminalFontInjectionToken } from "./token";

const redHatMonoTerminalFontInjectable = getInjectable({
  id: "red-hat-mono-terminal-font",
  instantiate: () => ({
    name: "Red Hat Mono",
    url: RedHatMono,
  }),
  injectionToken: terminalFontInjectionToken,
});

export default redHatMonoTerminalFontInjectable;
