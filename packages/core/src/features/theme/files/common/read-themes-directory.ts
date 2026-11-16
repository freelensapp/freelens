/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isBuiltInThemeName } from "./builtin-theme";
import { parseThemeFile } from "./parse";

import type { ImportedTheme, ImportedThemesState, InvalidThemeFile } from "./channels";

export const themeFileExtensions = [".yaml", ".yml", ".json"] as const;

export const isThemeFileName = (fileName: string) =>
  !fileName.startsWith(".") && themeFileExtensions.some((extension) => fileName.toLowerCase().endsWith(extension));

export interface ThemeDirectoryFile {
  fileName: string;
  content: string;
}

/**
 * Validates the files of the themes directory. A theme that takes the name of a built-in theme,
 * or a name an earlier file (in the order of the file names) already took, is not applied: its
 * file is listed with the reason instead.
 */
export const readThemesDirectory = (files: readonly ThemeDirectoryFile[]): ImportedThemesState => {
  const themes: ImportedTheme[] = [];
  const invalidFiles: InvalidThemeFile[] = [];
  const takenBy = new Map<string, string>();

  const sorted = [...files].sort((a, b) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0));

  for (const { fileName, content } of sorted) {
    const result = parseThemeFile(content);

    if (!result.isValid) {
      invalidFiles.push({ fileName, error: result.error });
      continue;
    }

    const { name } = result.theme.metadata;

    if (isBuiltInThemeName(name)) {
      invalidFiles.push({ fileName, error: `The name "${name}" is the name of a built-in theme` });
      continue;
    }

    const owner = takenBy.get(name);

    if (owner) {
      invalidFiles.push({ fileName, error: `The name "${name}" is already taken by ${owner}` });
      continue;
    }

    takenBy.set(name, fileName);
    themes.push({ theme: result.theme, fileName, unknownTokens: result.unknownTokens });
  }

  return { themes, invalidFiles };
};
