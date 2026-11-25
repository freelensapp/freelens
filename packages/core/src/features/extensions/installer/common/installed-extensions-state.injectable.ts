/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { InstalledExtensionEntry } from "./installed-extensions";

/**
 * Every extension the user has installed, keyed by its manifest name.
 *
 * Discovery is no longer a scan of one folder: it is this registry, resolved
 * against the managed root and against the arbitrary external paths recorded
 * here.
 */
const installedExtensionsStateInjectable = getInjectable({
  id: "installed-extensions-state",
  instantiate: () => observable.map<string, InstalledExtensionEntry>(),
});

export default installedExtensionsStateInjectable;
