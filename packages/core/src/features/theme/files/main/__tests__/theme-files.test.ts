/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import directoryForUserDataInjectable from "../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import pathExistsInjectable from "../../../../../common/fs/path-exists.injectable";
import readFileInjectable from "../../../../../common/fs/read-file.injectable";
import writeFileInjectable from "../../../../../common/fs/write-file.injectable";
import electronDialogInjectable from "../../../../../main/electron-app/features/electron-dialog.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import { parseThemeFile } from "../../common/parse";
import exportThemeListenerInjectable from "../handle-export.injectable";
import importThemeListenerInjectable from "../handle-import.injectable";
import removeThemeListenerInjectable from "../handle-remove.injectable";
import importedThemesStateInjectable from "../imported-themes-state.injectable";
import reloadImportedThemesInjectable from "../reload-imported-themes.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

const theme = (name: string, displayName = name) => `# a comment that stays
apiVersion: freelens.app/v1
kind: Theme
metadata:
  name: ${name}
spec:
  displayName: ${displayName}
  dark:
    colors:
      primary: "#ff0000"
`;

describe("theme files in the main process", () => {
  let di: DiContainer;
  let savePath: string | undefined;

  const importTheme = (filePath: string, replace = false) =>
    di.inject(importThemeListenerInjectable).handler({ filePath, replace });
  const writeFile = (filePath: string, content: string) => di.inject(writeFileInjectable)(filePath, content);
  const readFile = (filePath: string) => di.inject(readFileInjectable)(filePath);
  const themeNames = () =>
    di
      .inject(importedThemesStateInjectable)
      .get()
      .themes.map(({ theme }) => theme.metadata.name);

  beforeEach(async () => {
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/user-data");
    savePath = undefined;
    di.override(
      electronDialogInjectable,
      () =>
        ({
          showSaveDialog: async () =>
            savePath ? { canceled: false, filePath: savePath } : { canceled: true, filePath: "" },
        }) as never,
    );

    await di.inject(reloadImportedThemesInjectable)();
  });

  it("starts without imported themes", () => {
    expect(themeNames()).toEqual([]);
  });

  it("reads files put into the themes directory by hand", async () => {
    await writeFile("/user-data/themes/by-hand.yml", theme("by-hand"));
    await writeFile("/user-data/themes/broken.yaml", "kind: Theme");
    await di.inject(reloadImportedThemesInjectable)();

    expect(themeNames()).toEqual(["by-hand"]);
    expect(di.inject(importedThemesStateInjectable).get().invalidFiles).toEqual([
      { fileName: "broken.yaml", error: 'Unsupported apiVersion null: expected "freelens.app/v1"' },
    ]);
  });

  describe("import", () => {
    it("copies the file as <metadata.name>.yaml, comments included", async () => {
      await writeFile("/downloads/some file.json", theme("mine"));

      expect(await importTheme("/downloads/some file.json")).toEqual({
        status: "imported",
        name: "mine",
        displayName: "mine",
        unknownTokens: [],
      });
      expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine"));
      expect(themeNames()).toEqual(["mine"]);
    });

    it("refuses an invalid file", async () => {
      await writeFile("/downloads/bad.yaml", theme("Bad"));

      expect(await importTheme("/downloads/bad.yaml")).toMatchObject({ status: "invalid" });
      expect(themeNames()).toEqual([]);
    });

    it("refuses the name of the built-in theme", async () => {
      await writeFile("/downloads/freelens.yaml", theme("freelens"));

      expect(await importTheme("/downloads/freelens.yaml")).toMatchObject({
        status: "invalid",
        error: expect.stringContaining("built-in theme"),
      });
    });

    describe("of a theme whose name is taken", () => {
      beforeEach(async () => {
        await writeFile("/user-data/themes/other-file.yaml", theme("mine", "Old"));
        await di.inject(reloadImportedThemesInjectable)();
        await writeFile("/downloads/new.yaml", theme("mine", "New"));
      });

      it("asks before replacing it", async () => {
        expect(await importTheme("/downloads/new.yaml")).toMatchObject({ status: "conflict", name: "mine" });
        expect(di.inject(importedThemesStateInjectable).get().themes[0].theme.spec.displayName).toBe("Old");
      });

      it("replaces it when asked to, leaving a single file", async () => {
        expect(await importTheme("/downloads/new.yaml", true)).toMatchObject({ status: "imported" });
        expect(
          di
            .inject(importedThemesStateInjectable)
            .get()
            .themes.map(({ fileName }) => fileName),
        ).toEqual(["mine.yaml"]);
        expect(di.inject(importedThemesStateInjectable).get().themes[0].theme.spec.displayName).toBe("New");
        expect(await di.inject(pathExistsInjectable)("/user-data/themes/other-file.yaml")).toBe(false);
      });
    });
  });

  it("removes an imported theme's file", async () => {
    await writeFile("/downloads/mine.yaml", theme("mine"));
    await importTheme("/downloads/mine.yaml");

    expect(await di.inject(removeThemeListenerInjectable).handler("mine")).toEqual({ status: "removed" });
    expect(themeNames()).toEqual([]);
    expect(await di.inject(pathExistsInjectable)("/user-data/themes/mine.yaml")).toBe(false);
  });

  describe("export", () => {
    it("writes the built-in theme as a file that imports back", async () => {
      savePath = "/exports/freelens.yaml";

      expect(await di.inject(exportThemeListenerInjectable).handler("freelens")).toEqual({
        status: "exported",
        filePath: "/exports/freelens.yaml",
      });

      const exported = await readFile("/exports/freelens.yaml");

      expect(parseThemeFile(exported).isValid).toBe(true);

      await writeFile("/exports/copy.yaml", exported.replace('name: "freelens"', 'name: "freelens-copy"'));

      expect(await importTheme("/exports/copy.yaml")).toMatchObject({ status: "imported", name: "freelens-copy" });
    });

    it("does nothing when the dialog is canceled", async () => {
      expect(await di.inject(exportThemeListenerInjectable).handler("freelens")).toEqual({ status: "canceled" });
    });
  });
});
