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

/**
 * A request to import a theme. It never names a file: the main process asks for one with its own
 * file dialog, and keeps the file it chose, or downloaded, while it waits for the answer to a
 * `conflict`.
 */
export type ImportThemeRequest =
  /**
   * Asks for a file and imports it, unless it would replace a file of the themes directory.
   */
  | { action: "choose" }
  /**
   * Downloads a theme file from an `https:` or `http:` URL and imports it as `choose` imports a
   * file. The main process checks the URL itself.
   */
  | { action: "url"; url: string }
  /**
   * Imports the pending file of a `conflict`, replacing what the conflict lists.
   */
  | { action: "replace"; importId: string }
  /**
   * Drops the pending file of a `conflict`.
   */
  | { action: "cancel"; importId: string };

/**
 * What an import would replace in the themes directory.
 */
export type ThemeImportConflict =
  /**
   * The file holds an imported theme of the same name.
   */
  | { kind: "same-name"; fileName: string; displayName: string }
  /**
   * The file the import is written to holds a theme of another name.
   */
  | { kind: "other-theme"; fileName: string; name: string; displayName: string }
  /**
   * The file the import is written to is not a valid theme.
   */
  | { kind: "invalid-file"; fileName: string; error: string };

export type ImportThemeResponse =
  | { status: "canceled" }
  /**
   * The theme cannot be imported. `source` is the path of the file or the URL it came from.
   */
  | { status: "invalid"; source: string; error: string }
  | {
      status: "conflict";
      /**
       * Identifies the pending import in the `replace` or `cancel` request that answers it.
       */
      importId: string;
      name: string;
      displayName: string;
      /**
       * The file the theme is written to, `<name>.yaml`.
       */
      fileName: string;
      conflicts: ThemeImportConflict[];
    }
  /**
   * A `replace` or `cancel` for an import that is not pending, because it was answered already
   * or another import replaced it.
   */
  | { status: "expired" }
  | { status: "imported"; name: string; displayName: string; unknownTokens: string[] };

export const importThemeChannel: RequestChannel<ImportThemeRequest, ImportThemeResponse> = {
  id: "import-theme",
};

/**
 * `invalid` refuses a name that cannot be the name of a theme, before anything is read or written.
 */
export type ExportThemeResponse =
  | { status: "canceled" }
  | { status: "exported"; filePath: string }
  | { status: "invalid"; error: string };

export const exportThemeChannel: RequestChannel<string, ExportThemeResponse> = {
  id: "export-theme",
};

/**
 * `invalid` refuses a name that cannot be the name of a theme, before anything is read or removed.
 */
export type RemoveThemeResponse =
  | { status: "removed" }
  | { status: "not-found" }
  | { status: "invalid"; error: string };

export const removeThemeChannel: RequestChannel<string, RemoveThemeResponse> = {
  id: "remove-theme",
};
