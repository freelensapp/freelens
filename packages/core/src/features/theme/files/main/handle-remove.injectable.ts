/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import { removeThemeChannel } from "../common/channels";
import { getThemeNameError } from "../common/schema";
import getThemeFilePathInjectable from "./get-theme-file-path.injectable";
import importedThemesStateInjectable from "./imported-themes-state.injectable";
import reloadImportedThemesInjectable from "./reload-imported-themes.injectable";

import type { RemoveThemeResponse } from "../common/channels";

const removeThemeListenerInjectable = getRequestChannelListenerInjectable({
  id: "remove-theme-listener",
  channel: removeThemeChannel,
  getHandler: (di) => {
    const removePath = di.inject(removePathInjectable);
    const getThemeFilePath = di.inject(getThemeFilePathInjectable);
    const state = di.inject(importedThemesStateInjectable);
    const reloadImportedThemes = di.inject(reloadImportedThemesInjectable);

    return async (name): Promise<RemoveThemeResponse> => {
      const nameError = getThemeNameError(name);

      if (nameError) {
        return { status: "invalid", error: nameError };
      }

      const imported = state.get().themes.find((theme) => theme.theme.metadata.name === name);

      if (!imported) {
        return { status: "not-found" };
      }

      await removePath(getThemeFilePath(imported.fileName));
      await reloadImportedThemes();

      return { status: "removed" };
    };
  },
});

export default removeThemeListenerInjectable;
