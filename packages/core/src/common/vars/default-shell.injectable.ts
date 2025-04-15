/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import isFlatpakPackageInjectable from "./is-flatpak-package.injectable";
import isLinuxInjectable from "./is-linux.injectable";
import isMacInjectable from "./is-mac.injectable";
import isWindowsInjectable from "./is-windows.injectable";

const defaultShellInjectable = getInjectable({
  id: "default-shell",

  instantiate: (di) => {
    const isFlatpakPackage = di.inject(isFlatpakPackageInjectable);
    const isLinux = di.inject(isLinuxInjectable);
    const isMac = di.inject(isMacInjectable);
    const isWindows = di.inject(isWindowsInjectable);

    if (isFlatpakPackage) {
      return "/app/bin/host-spawn";
    }

    if (process.env.SHELL) {
      return process.env.SHELL;
    }

    if (process.env.PTYSHELL) {
      return process.env.PTYSHELL;
    }

    if (isWindows) {
      return "powershell.exe";
    }

    if (isMac) {
      return "zsh";
    }

    if (isLinux) {
      return "bash";
    }

    return "System default shell";
  },

  causesSideEffects: true,
});

export default defaultShellInjectable;
