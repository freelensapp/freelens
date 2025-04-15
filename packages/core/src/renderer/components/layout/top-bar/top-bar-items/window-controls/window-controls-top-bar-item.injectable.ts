/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import isLinuxInjectable from "../../../../../../common/vars/is-linux.injectable";
import isWindowsInjectable from "../../../../../../common/vars/is-windows.injectable";
import { topBarItemOnRightSideInjectionToken } from "../top-bar-item-injection-token";
import { WindowControls } from "./window-controls";

const windowControlsTopBarItemInjectable = getInjectable({
  id: "window-controls-top-bar-item",

  instantiate: (di) => {
    const isWindows = di.inject(isWindowsInjectable);
    const isLinux = di.inject(isLinuxInjectable);

    return {
      id: "window-controls",
      orderNumber: 900,
      isShown: computed(() => isWindows || isLinux),
      Component: WindowControls,
    };
  },

  injectionToken: topBarItemOnRightSideInjectionToken,
});

export default windowControlsTopBarItemInjectable;
