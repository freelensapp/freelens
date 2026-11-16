/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import { removeThemeChannel } from "../common/channels";
import importedThemesStateInjectable from "./imported-themes-state.injectable";
import reloadImportedThemesInjectable from "./reload-imported-themes.injectable";
import themesDirectoryInjectable from "./themes-directory.injectable";

import type { RemoveThemeResponse } from "../common/channels";

const removeThemeListenerInjectable = getRequestChannelListenerInjectable({
  id: "remove-theme-listener",
  channel: removeThemeChannel,
  getHandler: (di) => {
    const removePath = di.inject(removePathInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const themesDirectory = di.inject(themesDirectoryInjectable);
    const state = di.inject(importedThemesStateInjectable);
    const reloadImportedThemes = di.inject(reloadImportedThemesInjectable);

    return async (name): Promise<RemoveThemeResponse> => {
      const imported = state.get().themes.find((theme) => theme.theme.metadata.name === name);

      if (!imported) {
        return { status: "not-found" };
      }

      await removePath(joinPaths(themesDirectory, imported.fileName));
      await reloadImportedThemes();

      return { status: "removed" };
    };
  },
});

export default removeThemeListenerInjectable;
