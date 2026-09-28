/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import installedExtensionsStateInjectable from "./installed-extensions-state.injectable";

import type { InstalledExtensionEntry } from "./installed-extensions";

export type RecordInstalledExtension = (entry: InstalledExtensionEntry) => void;

/**
 * Make an install the live one. Only one version of an extension is active at a
 * time, so this replaces any previous entry for the same name.
 */
const recordInstalledExtensionInjectable = getInjectable({
  id: "record-installed-extension",
  instantiate: (di): RecordInstalledExtension => {
    const state = di.inject(installedExtensionsStateInjectable);

    return action((entry) => {
      state.set(entry.name, entry);
    });
  },
});

export default recordInstalledExtensionInjectable;
