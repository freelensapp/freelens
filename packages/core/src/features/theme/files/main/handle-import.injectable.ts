/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import readFileInjectable from "../../../../common/fs/read-file.injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import writeFileInjectable from "../../../../common/fs/write-file.injectable";
import joinPathsInjectable from "../../../../common/path/join-paths.injectable";
import electronDialogInjectable from "../../../../main/electron-app/features/electron-dialog.injectable";
import { builtInThemeName } from "../common/builtin-theme";
import { importThemeChannel } from "../common/channels";
import { parseThemeFile } from "../common/parse";
import importedThemesStateInjectable from "./imported-themes-state.injectable";
import reloadImportedThemesInjectable from "./reload-imported-themes.injectable";
import themesDirectoryInjectable from "./themes-directory.injectable";

import type { ImportThemeResponse } from "../common/channels";

const importThemeListenerInjectable = getRequestChannelListenerInjectable({
  id: "import-theme-listener",
  channel: importThemeChannel,
  getHandler: (di) => {
    const dialog = di.inject(electronDialogInjectable);
    const readFile = di.inject(readFileInjectable);
    const writeFile = di.inject(writeFileInjectable);
    const removePath = di.inject(removePathInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const themesDirectory = di.inject(themesDirectoryInjectable);
    const state = di.inject(importedThemesStateInjectable);
    const reloadImportedThemes = di.inject(reloadImportedThemesInjectable);

    return async ({ filePath: requestedPath, replace = false }): Promise<ImportThemeResponse> => {
      let filePath = requestedPath;

      if (!filePath) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: "Import a theme",
          buttonLabel: "Import",
          properties: ["openFile"],
          filters: [{ name: "Theme files", extensions: ["yaml", "yml", "json"] }],
        });

        if (canceled || filePaths.length === 0) {
          return { status: "canceled" };
        }

        [filePath] = filePaths;
      }

      let content: string;

      try {
        content = await readFile(filePath);
      } catch (error) {
        return {
          status: "invalid",
          filePath,
          error: `The file cannot be read: ${error instanceof Error ? error.message : String(error)}`,
        };
      }

      const result = parseThemeFile(content);

      if (!result.isValid) {
        return { status: "invalid", filePath, error: result.error };
      }

      const { name } = result.theme.metadata;
      const { displayName } = result.theme.spec;

      if (name === builtInThemeName) {
        return {
          status: "invalid",
          filePath,
          error: `The name "${name}" is the name of the built-in theme: change metadata.name to import it`,
        };
      }

      const existing = state.get().themes.find((imported) => imported.theme.metadata.name === name);

      if (existing && !replace) {
        return { status: "conflict", filePath, name, displayName };
      }

      const targetFileName = `${name}.yaml`;

      // The file is copied as it is, so that its comments stay. A JSON file is valid YAML.
      await writeFile(joinPaths(themesDirectory, targetFileName), content);

      if (existing && existing.fileName !== targetFileName) {
        await removePath(joinPaths(themesDirectory, existing.fileName));
      }

      await reloadImportedThemes();

      return { status: "imported", name, displayName, unknownTokens: result.unknownTokens };
    };
  },
});

export default importThemeListenerInjectable;
