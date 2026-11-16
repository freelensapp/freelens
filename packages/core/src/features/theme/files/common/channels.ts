/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MessageChannel, RequestChannel } from "@freelensapp/messaging";

import type { ThemeFile } from "./schema";

/**
 * A valid theme file of the themes directory.
 */
export interface ImportedTheme {
  theme: ThemeFile;
  fileName: string;
  /**
   * The tokens of the file the application does not know, which it ignores.
   */
  unknownTokens: string[];
}

/**
 * A file of the themes directory that is not applied, with the reason.
 */
export interface InvalidThemeFile {
  fileName: string;
  error: string;
}

/**
 * The themes of the themes directory, as the main process gives them to every frame.
 */
export interface ImportedThemesState {
  themes: ImportedTheme[];
  invalidFiles: InvalidThemeFile[];
}

export const initialImportedThemesChannel: RequestChannel<void, ImportedThemesState> = {
  id: "initial-imported-themes",
};

export const importedThemesUpdateChannel: MessageChannel<ImportedThemesState> = {
  id: "imported-themes-update",
};

export interface ImportThemeRequest {
  /**
   * The file to import. Without it, the main process asks for one with a file dialog.
   */
  filePath?: string;
  /**
   * Replaces an imported theme of the same name.
   */
  replace?: boolean;
}

export type ImportThemeResponse =
  | { status: "canceled" }
  | { status: "invalid"; filePath: string; error: string }
  | { status: "conflict"; filePath: string; name: string; displayName: string }
  | { status: "imported"; name: string; displayName: string; unknownTokens: string[] };

export const importThemeChannel: RequestChannel<ImportThemeRequest, ImportThemeResponse> = {
  id: "import-theme",
};

export type ExportThemeResponse = { status: "canceled" } | { status: "exported"; filePath: string };

export const exportThemeChannel: RequestChannel<string, ExportThemeResponse> = {
  id: "export-theme",
};

export type RemoveThemeResponse = { status: "removed" } | { status: "not-found" };

export const removeThemeChannel: RequestChannel<string, RemoveThemeResponse> = {
  id: "remove-theme",
};
