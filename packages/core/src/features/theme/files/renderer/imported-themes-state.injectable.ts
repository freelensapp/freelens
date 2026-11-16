/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable } from "mobx";

import type { ImportedThemesState } from "../common/channels";

/**
 * The themes of the themes directory, as the main process last sent them.
 */
const importedThemesStateInjectable = getInjectable({
  id: "imported-themes-state-renderer",
  instantiate: () => observable.box<ImportedThemesState>({ themes: [], invalidFiles: [] }, { deep: false }),
});

export default importedThemesStateInjectable;
