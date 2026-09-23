/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import installedExtensionsStateInjectable from "./installed-extensions-state.injectable";

export type ForgetInstalledExtension = (name: string) => void;

/**
 * Drop an extension from the registry.
 *
 * For a development install this is the whole of uninstalling: the directory
 * belongs to its author and symmetry with a managed install would delete their
 * working copy.
 */
const forgetInstalledExtensionInjectable = getInjectable({
  id: "forget-installed-extension",
  instantiate: (di): ForgetInstalledExtension => {
    const state = di.inject(installedExtensionsStateInjectable);

    return action((name) => {
      state.delete(name);
    });
  },
});

export default forgetInstalledExtensionInjectable;
