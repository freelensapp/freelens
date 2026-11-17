/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import writeFileInjectable from "../../../../common/fs/write-file.injectable";
import electronDialogInjectable from "../../../../main/electron-app/features/electron-dialog.injectable";
import { findBuiltInTheme } from "../common/builtin-theme";
import { exportThemeChannel } from "../common/channels";
import { serializeThemeFile } from "../common/parse";
import { getThemeNameError } from "../common/schema";
import importedThemesStateInjectable from "./imported-themes-state.injectable";

import type { ExportThemeResponse } from "../common/channels";

const exportThemeListenerInjectable = getRequestChannelListenerInjectable({
  id: "export-theme-listener",
  channel: exportThemeChannel,
  getHandler: (di) => {
    const dialog = di.inject(electronDialogInjectable);
    const writeFile = di.inject(writeFileInjectable);
    const state = di.inject(importedThemesStateInjectable);

    return async (name): Promise<ExportThemeResponse> => {
      const nameError = getThemeNameError(name);

      if (nameError) {
        return { status: "invalid", error: nameError };
      }

      const theme =
        findBuiltInTheme(name) ?? state.get().themes.find((imported) => imported.theme.metadata.name === name)?.theme;

      if (!theme) {
        throw new Error(`There is no theme named "${name}"`);
      }

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Export a theme",
        buttonLabel: "Export",
        defaultPath: `${name}.yaml`,
        filters: [{ name: "Theme files", extensions: ["yaml", "yml"] }],
      });

      if (canceled || !filePath) {
        return { status: "canceled" };
      }

      await writeFile(filePath, serializeThemeFile(theme));

      return { status: "exported", filePath };
    };
  },
});

export default exportThemeListenerInjectable;
