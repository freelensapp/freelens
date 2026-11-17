/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRequestChannelListenerInjectable } from "@freelensapp/messaging";
import fsInjectable from "../../../../common/fs/fs.injectable";
import pathExistsInjectable from "../../../../common/fs/path-exists.injectable";
import readFileInjectable from "../../../../common/fs/read-file.injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import statInjectable from "../../../../common/fs/stat.injectable";
import writeFileInjectable from "../../../../common/fs/write-file.injectable";
import randomUUIDInjectable from "../../../../main/crypto/random-uuid.injectable";
import electronDialogInjectable from "../../../../main/electron-app/features/electron-dialog.injectable";
import downloadBinaryInjectable, { getDownloadTooLargeError } from "../../../../main/fetch/download-binary.injectable";
import { isBuiltInThemeName } from "../common/builtin-theme";
import { importThemeChannel } from "../common/channels";
import { getThemeUrlError, maxThemeFileSize, themeFileTooLargeError } from "../common/import-source";
import { parseThemeFile } from "../common/parse";
import { getThemeNameError } from "../common/schema";
import getThemeFilePathInjectable from "./get-theme-file-path.injectable";
import importedThemesStateInjectable from "./imported-themes-state.injectable";
import reloadImportedThemesInjectable from "./reload-imported-themes.injectable";

import type { ImportThemeRequest, ImportThemeResponse, ThemeImportConflict } from "../common/channels";
import type { ThemeFile } from "../common/schema";

/**
 * A file the open dialog chose, or a download, waiting for the answer to the conflict it raised.
 * The renderer refers to it by its id only, so the file imported on `replace` is always the one
 * the dialog chose, or the URL gave, as it was read then.
 */
interface PendingImport extends ChosenFile {
  id: string;
  /**
   * What the question listed, which the answer replaces.
   */
  conflicts: ThemeImportConflict[];
}

/**
 * A file the open dialog chose, or a download, as it was read then.
 */
interface ChosenFile {
  /**
   * The path of the file, or the URL.
   */
  source: string;
  content: string;
  theme: ThemeFile;
  unknownTokens: string[];
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

const isFileExistsError = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === "EEXIST";

/**
 * How long a download of a theme file may take, from the request to the last byte.
 */
const downloadTimeout = 30_000;

const importThemeListenerInjectable = getRequestChannelListenerInjectable({
  id: "import-theme-listener",
  channel: importThemeChannel,
  getHandler: (di) => {
    const dialog = di.inject(electronDialogInjectable);
    const readFile = di.inject(readFileInjectable);
    const stat = di.inject(statInjectable);
    const downloadBinary = di.inject(downloadBinaryInjectable);
    const writeFile = di.inject(writeFileInjectable);
    const removePath = di.inject(removePathInjectable);
    const pathExists = di.inject(pathExistsInjectable);
    const { rename } = di.inject(fsInjectable);
    const getThemeFilePath = di.inject(getThemeFilePathInjectable);
    const randomUUID = di.inject(randomUUIDInjectable);
    const state = di.inject(importedThemesStateInjectable);
    const reloadImportedThemes = di.inject(reloadImportedThemesInjectable);

    let pending: PendingImport | undefined;

    /**
     * What writing the theme as `targetFileName` would replace: an imported theme of the same name
     * in another file, and whatever the target file holds.
     */
    const findConflicts = async (name: string, targetFileName: string): Promise<ThemeImportConflict[]> => {
      const conflicts: ThemeImportConflict[] = [];
      const existing = state.get().themes.find(({ theme }) => theme.metadata.name === name);

      if (existing && existing.fileName !== targetFileName) {
        conflicts.push({
          kind: "same-name",
          fileName: existing.fileName,
          displayName: existing.theme.spec.displayName,
        });
      }

      const targetPath = getThemeFilePath(targetFileName);

      if (!(await pathExists(targetPath))) {
        return conflicts;
      }

      let content: string;

      try {
        content = await readFile(targetPath);
      } catch (error) {
        conflicts.push({
          kind: "invalid-file",
          fileName: targetFileName,
          error: `The file cannot be read: ${describeError(error)}`,
        });

        return conflicts;
      }

      const result = parseThemeFile(content);

      if (!result.isValid) {
        conflicts.push({ kind: "invalid-file", fileName: targetFileName, error: result.error });
      } else if (result.theme.metadata.name === name) {
        conflicts.push({ kind: "same-name", fileName: targetFileName, displayName: result.theme.spec.displayName });
      } else {
        conflicts.push({
          kind: "other-theme",
          fileName: targetFileName,
          name: result.theme.metadata.name,
          displayName: result.theme.spec.displayName,
        });
      }

      return conflicts;
    };

    const askFirst = (chosen: ChosenFile, conflicts: ThemeImportConflict[]): ImportThemeResponse => {
      const { name } = chosen.theme.metadata;

      pending = { ...chosen, id: randomUUID(), conflicts };

      return {
        status: "conflict",
        importId: pending.id,
        name,
        displayName: chosen.theme.spec.displayName,
        fileName: `${name}.yaml`,
        conflicts,
      };
    };

    const importedResponse = ({ theme, unknownTokens }: ChosenFile): ImportThemeResponse => ({
      status: "imported",
      name: theme.metadata.name,
      displayName: theme.spec.displayName,
      unknownTokens,
    });

    /**
     * Imports the content of a file or a download, unless it would replace something in the themes
     * directory: then it keeps the content pending and asks. Both sources go through it, so that
     * they are validated alike.
     */
    const importContent = async (source: string, content: string): Promise<ImportThemeResponse> => {
      // Checked before, but measured again on what was read: a file can grow in between.
      if (Buffer.byteLength(content, "utf-8") > maxThemeFileSize) {
        return { status: "invalid", source, error: themeFileTooLargeError };
      }

      const result = parseThemeFile(content);

      if (!result.isValid) {
        return { status: "invalid", source, error: result.error };
      }

      const { name } = result.theme.metadata;
      // The schema has checked the name already. It becomes a file name, so it is checked again
      // here, where it is used, rather than relying on the schema alone.
      const nameError = getThemeNameError(name);

      if (nameError) {
        return { status: "invalid", source, error: nameError };
      }

      if (isBuiltInThemeName(name)) {
        return {
          status: "invalid",
          source,
          error: `The name "${name}" is the name of a built-in theme: change metadata.name to import it`,
        };
      }

      const chosen = { source, content, theme: result.theme, unknownTokens: result.unknownTokens };
      const targetFileName = `${name}.yaml`;
      const conflicts = await findConflicts(name, targetFileName);

      if (conflicts.length > 0) {
        return askFirst(chosen, conflicts);
      }

      try {
        // The file is copied as it is, so that its comments stay. A JSON file is valid YAML. The
        // flag refuses to write over a file that appeared since the check, or a link.
        await writeFile(getThemeFilePath(targetFileName), content, { flag: "wx" });
      } catch (error) {
        if (!isFileExistsError(error)) {
          throw error;
        }

        // A link that leads nowhere exists for the write, but not for the check.
        const appeared = await findConflicts(name, targetFileName);
        const inTheWay: ThemeImportConflict = {
          kind: "invalid-file",
          fileName: targetFileName,
          error: "The file exists, but cannot be read",
        };

        return askFirst(chosen, appeared.length > 0 ? appeared : [inTheWay]);
      }

      await reloadImportedThemes();

      return importedResponse(chosen);
    };

    /**
     * Imports a file the open dialog chose.
     */
    const choose = async (): Promise<ImportThemeResponse> => {
      pending = undefined;

      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "Import a theme",
        buttonLabel: "Import",
        properties: ["openFile"],
        filters: [{ name: "Theme files", extensions: ["yaml", "yml", "json"] }],
      });

      if (canceled || filePaths.length === 0) {
        return { status: "canceled" };
      }

      const [filePath] = filePaths;
      let content: string;

      try {
        // Measured before it is read, so that a large file is never read at all. A device or a
        // pipe has no size to measure, and could be read forever.
        const stats = await stat(filePath);

        if (!stats.isFile()) {
          return { status: "invalid", source: filePath, error: "The theme is not a regular file" };
        }

        if (stats.size > maxThemeFileSize) {
          return { status: "invalid", source: filePath, error: themeFileTooLargeError };
        }

        content = await readFile(filePath);
      } catch (error) {
        return { status: "invalid", source: filePath, error: `The file cannot be read: ${describeError(error)}` };
      }

      return importContent(filePath, content);
    };

    /**
     * Imports a theme file downloaded from a URL of the request, which is checked here: the
     * renderer has checked it too, but is not trusted to.
     */
    const download = async (url: unknown): Promise<ImportThemeResponse> => {
      pending = undefined;

      const urlError = getThemeUrlError(url);

      if (typeof url !== "string" || urlError) {
        return { status: "invalid", source: typeof url === "string" ? url : "", error: urlError ?? "" };
      }

      const result = await downloadBinary(url, { timeout: downloadTimeout, maxSize: maxThemeFileSize });

      if (!result.callWasSuccessful) {
        const error =
          result.error === getDownloadTooLargeError(maxThemeFileSize)
            ? themeFileTooLargeError
            : `The theme cannot be downloaded: ${result.error || "the request failed"}`;

        return { status: "invalid", source: url, error };
      }

      return importContent(url, result.response.toString("utf-8"));
    };

    /**
     * Imports the pending file, replacing what its conflict listed. When the themes directory has
     * changed since the question in a way that adds to it, asks again instead.
     */
    const replace = async (importing: PendingImport): Promise<ImportThemeResponse> => {
      const { name } = importing.theme.metadata;
      const targetFileName = `${name}.yaml`;
      const conflicts = await findConflicts(name, targetFileName);
      const asked = new Set(importing.conflicts.map((conflict) => JSON.stringify(conflict)));

      if (conflicts.some((conflict) => !asked.has(JSON.stringify(conflict)))) {
        return askFirst(importing, conflicts);
      }

      const targetPath = getThemeFilePath(targetFileName);
      // Written beside the target and renamed over it, so that a failed write leaves the old file,
      // and a link in place of the target is replaced rather than followed. The leading dot keeps
      // it out of the themes the directory is read for.
      const temporaryPath = getThemeFilePath(`.${targetFileName}.${importing.id}.tmp`);

      try {
        await writeFile(temporaryPath, importing.content, { flag: "wx" });
        await rename(temporaryPath, targetPath);
      } catch (error) {
        await removePath(temporaryPath);
        throw error;
      }

      for (const conflict of conflicts) {
        if (conflict.kind === "same-name" && conflict.fileName !== targetFileName) {
          await removePath(getThemeFilePath(conflict.fileName));
        }
      }

      await reloadImportedThemes();

      return importedResponse(importing);
    };

    return async (request: ImportThemeRequest): Promise<ImportThemeResponse> => {
      // Only the action, the id and the URL of a request are read: whatever else it carries, a
      // path above all, is ignored.
      const action: unknown = request?.action;

      if (action === "choose") {
        return choose();
      }

      if (action === "url") {
        return download((request as { url?: unknown }).url);
      }

      if (action !== "replace" && action !== "cancel") {
        throw new Error(`Unknown theme import action ${JSON.stringify(action)}`);
      }

      const importing = pending;
      const importId: unknown = (request as { importId?: unknown }).importId;

      if (!importing || typeof importId !== "string" || importId !== importing.id) {
        return { status: "expired" };
      }

      pending = undefined;

      return action === "replace" ? replace(importing) : { status: "canceled" };
    };
  },
});

export default importThemeListenerInjectable;
