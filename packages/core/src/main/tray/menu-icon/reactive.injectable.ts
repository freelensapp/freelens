/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getStartableStoppable } from "@freelensapp/startable-stoppable";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import electronTrayInjectable from "../electron-tray/electron-tray.injectable";
import trayIconInjectable from "./tray-icon.injectable";

const reactiveTrayMenuIconInjectable = getInjectable({
  id: "reactive-tray-menu-icon",

  instantiate: (di) => {
    const trayMenuIcon = di.inject(trayIconInjectable);
    const electronTray = di.inject(electronTrayInjectable);

    return getStartableStoppable("reactive-tray-menu-icon", () =>
      reaction(
        () => trayMenuIcon.get(),
        (icon) => {
          electronTray.setIconPath(icon.iconPath);
        },
        {
          fireImmediately: true,
        },
      ),
    );
  },
});

export default reactiveTrayMenuIconInjectable;
