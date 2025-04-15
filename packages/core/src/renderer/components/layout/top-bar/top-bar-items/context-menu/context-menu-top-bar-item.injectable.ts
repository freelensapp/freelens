/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import isLinuxInjectable from "../../../../../../common/vars/is-linux.injectable";
import isWindowsInjectable from "../../../../../../common/vars/is-windows.injectable";
import { topBarItemOnLeftSideInjectionToken } from "../top-bar-item-injection-token";
import { ContextMenu } from "./context-menu";

const contextMenuTopBarItemInjectable = getInjectable({
  id: "context-menu-top-bar-item",

  instantiate: (di) => {
    const isWindows = di.inject(isWindowsInjectable);
    const isLinux = di.inject(isLinuxInjectable);

    return {
      id: "context-menu",
      isShown: computed(() => isWindows || isLinux),
      orderNumber: 10,
      Component: ContextMenu,
    };
  },

  injectionToken: topBarItemOnLeftSideInjectionToken,
});

export default contextMenuTopBarItemInjectable;
