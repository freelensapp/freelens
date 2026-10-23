/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import defaultShellInjectable from "../../common/vars/default-shell.injectable";
import userShellSettingInjectable from "../../features/user-preferences/common/shell-setting.injectable";

export type GetUserShell = () => string;

/**
 * The shell a terminal starts now: the user's shell setting, else the system
 * default shell. Read on every call, as the setting can change at any time.
 */
const getUserShellInjectable = getInjectable({
  id: "get-user-shell",

  instantiate: (di): GetUserShell => {
    const userShellSetting = di.inject(userShellSettingInjectable);
    const defaultShell = di.inject(defaultShellInjectable);

    return () => userShellSetting.get() || defaultShell;
  },
});

export default getUserShellInjectable;
