/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../../../common/fs/fs.injectable";
import pathExistsInjectable from "../../../../../common/fs/path-exists.injectable";
import readFileInjectable from "../../../../../common/fs/read-file.injectable";
import writeFileInjectable from "../../../../../common/fs/write-file.injectable";
import randomUUIDInjectable from "../../../../../main/crypto/random-uuid.injectable";
import electronDialogInjectable from "../../../../../main/electron-app/features/electron-dialog.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import { parseThemeFile } from "../../common/parse";
import getThemeFilePathInjectable from "../get-theme-file-path.injectable";
import exportThemeListenerInjectable from "../handle-export.injectable";
import importThemeListenerInjectable from "../handle-import.injectable";
import removeThemeListenerInjectable from "../handle-remove.injectable";
import importedThemesStateInjectable from "../imported-themes-state.injectable";
import reloadImportedThemesInjectable from "../reload-imported-themes.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ImportThemeRequest, ImportThemeResponse } from "../../common/channels";

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

/**
 * A theme as JSON, which is YAML too, so that any name, a NUL byte included, is written as it is.
 */
const jsonTheme = (name: string) =>
  JSON.stringify({
    apiVersion: "freelens.app/v1",
    kind: "Theme",
    metadata: { name },
    spec: { displayName: "Hostile", dark: { colors: { primary: "#ff0000" } } },
  });

const hostileNames = ["../../../etc/passwd", "..", "/etc/passwd", "a/b", "a\\b", "a\0b"];

/**
 * A file no request may make the main process read.
 */
const privateKey = "-----BEGIN OPENSSH PRIVATE KEY-----\nrZXktdjEAAAAABG5vbmUAAAAEbm9uZQ: x: y\n";

const fileSystemMethods = ["readFile", "writeFile", "pathExists", "rm", "rename", "readdir", "access", "stat", "lstat"];

describe("theme files in the main process", () => {
  let di: DiContainer;
  let savePath: string | undefined;
  let openPath: string | undefined;
  let showOpenDialog: ReturnType<typeof vi.fn>;
  let showSaveDialog: ReturnType<typeof vi.fn>;
  let fileSystem: Record<string, ReturnType<typeof vi.fn>>;

  const openDialog = async () =>
    openPath ? { canceled: false, filePaths: [openPath] } : { canceled: true, filePaths: [] };
  const saveDialog = async () =>
    savePath ? { canceled: false, filePath: savePath } : { canceled: true, filePath: "" };
  const request = (importRequest: ImportThemeRequest) =>
    di.inject(importThemeListenerInjectable).handler(importRequest);
  const chooseAndImport = (filePath: string) => {
    openPath = filePath;

    return request({ action: "choose" });
  };
  const replace = (response: ImportThemeResponse) => {
    expect(response.status).toBe("conflict");

    return request({ action: "replace", importId: (response as { importId: string }).importId });
  };
  const writeFile = (filePath: string, content: string) => di.inject(writeFileInjectable)(filePath, content);
  const readFile = (filePath: string) => di.inject(readFileInjectable)(filePath);
  const pathExists = (filePath: string) => di.inject(pathExistsInjectable)(filePath);
  const reload = () => di.inject(reloadImportedThemesInjectable)();
  const themeNames = () =>
    di
      .inject(importedThemesStateInjectable)
      .get()
      .themes.map(({ theme }) => theme.metadata.name);
  const resetSpies = () => {
    showOpenDialog.mockClear();
    showSaveDialog.mockClear();
    Object.values(fileSystem).forEach((spy) => spy.mockClear());
  };

  beforeEach(async () => {
    di = getDiForUnitTesting();
    di.override(directoryForUserDataInjectable, () => "/user-data");

    let lastId = 0;

    di.override(randomUUIDInjectable, () => () => `import-${++lastId}` as never);
    savePath = undefined;
    openPath = undefined;
    showOpenDialog = vi.fn().mockImplementation(openDialog);
    showSaveDialog = vi.fn().mockImplementation(saveDialog);
    di.override(electronDialogInjectable, () => ({ showOpenDialog, showSaveDialog }) as never);

    // Spied on before anything takes a method of it, so that every access of the file system of
    // the handlers goes through a spy.
    const fs = di.inject(fsInjectable) as unknown as Record<string, (...args: unknown[]) => unknown>;

    fileSystem = Object.fromEntries(
      fileSystemMethods.map((method) => [method, vi.spyOn(fs, method) as unknown as ReturnType<typeof vi.fn>]),
    );

    await reload();
  });

  it("starts without imported themes", () => {
    expect(themeNames()).toEqual([]);
  });

  it("reads files put into the themes directory by hand", async () => {
    await writeFile("/user-data/themes/by-hand.yml", theme("by-hand"));
    await writeFile("/user-data/themes/broken.yaml", "kind: Theme");
    await reload();

    expect(themeNames()).toEqual(["by-hand"]);
    expect(di.inject(importedThemesStateInjectable).get().invalidFiles).toEqual([
      { fileName: "broken.yaml", error: 'Unsupported apiVersion null: expected "freelens.app/v1"' },
    ]);
  });

  describe("import", () => {
    it("copies the file the dialog chose as <metadata.name>.yaml, comments included", async () => {
      await writeFile("/downloads/some file.json", theme("mine"));

      expect(await chooseAndImport("/downloads/some file.json")).toEqual({
        status: "imported",
        name: "mine",
        displayName: "mine",
        unknownTokens: [],
      });
      expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine"));
      expect(themeNames()).toEqual(["mine"]);
    });

    it("does nothing when the dialog is canceled", async () => {
      expect(await request({ action: "choose" })).toEqual({ status: "canceled" });
      expect(themeNames()).toEqual([]);
    });

    it("refuses an invalid file", async () => {
      await writeFile("/downloads/bad.yaml", theme("Bad"));

      expect(await chooseAndImport("/downloads/bad.yaml")).toMatchObject({ status: "invalid" });
      expect(themeNames()).toEqual([]);
    });

    it.each(["freelens", "ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized"])(
      "refuses the name of the built-in theme %s",
      async (name) => {
        await writeFile(`/downloads/${name}.yaml`, theme(name));

        expect(await chooseAndImport(`/downloads/${name}.yaml`)).toMatchObject({
          status: "invalid",
          error: expect.stringContaining("a built-in theme"),
        });
        expect(themeNames()).toEqual([]);
      },
    );

    describe("a request cannot name a file", () => {
      beforeEach(async () => {
        await writeFile("/secret/id_ed25519", privateKey);
        resetSpies();
      });

      const readPaths = () => fileSystem.readFile.mock.calls.map(([filePath]) => filePath);

      it("reads the file the dialog chose, not a path in the request", async () => {
        await writeFile("/downloads/chosen.yaml", theme("chosen"));
        openPath = "/downloads/chosen.yaml";

        const response = await request({ action: "choose", filePath: "/secret/id_ed25519" } as never);

        expect(response).toMatchObject({ status: "imported", name: "chosen" });
        expect(showOpenDialog).toHaveBeenCalledOnce();
        expect(readPaths()).not.toContain("/secret/id_ed25519");
      });

      it("reads nothing when the dialog is canceled, whatever path the request carries", async () => {
        expect(await request({ action: "choose", filePath: "/secret/id_ed25519" } as never)).toEqual({
          status: "canceled",
        });
        expect(readPaths()).toEqual([]);
      });

      it.each([
        { action: "replace", importId: "made-up", filePath: "/secret/id_ed25519", replace: true },
        { action: "cancel", importId: "made-up", filePath: "/secret/id_ed25519" },
        { action: "replace", filePath: "/secret/id_ed25519" },
      ])("answers %o without a pending import with expired, reading nothing", async (answer) => {
        expect(await request(answer as never)).toEqual({ status: "expired" });
        expect(readPaths()).toEqual([]);
        expect(fileSystem.writeFile).not.toHaveBeenCalled();
      });

      it.each([{}, { filePath: "/secret/id_ed25519" }, { filePath: "/secret/id_ed25519", replace: true }])(
        "refuses a request without a known action, %o, reading nothing",
        async (unknown) => {
          await expect(request(unknown as never)).rejects.toThrow("Unknown theme import action");
          expect(showOpenDialog).not.toHaveBeenCalled();
          expect(readPaths()).toEqual([]);
        },
      );
    });

    describe("of a theme whose name another file holds", () => {
      beforeEach(async () => {
        await writeFile("/user-data/themes/other-file.yaml", theme("mine", "Old"));
        await reload();
        await writeFile("/downloads/new.yaml", theme("mine", "New"));
      });

      it("asks before replacing it, naming the file", async () => {
        expect(await chooseAndImport("/downloads/new.yaml")).toMatchObject({
          status: "conflict",
          name: "mine",
          displayName: "New",
          fileName: "mine.yaml",
          conflicts: [{ kind: "same-name", fileName: "other-file.yaml", displayName: "Old" }],
        });
        expect(di.inject(importedThemesStateInjectable).get().themes[0].theme.spec.displayName).toBe("Old");
        expect(await pathExists("/user-data/themes/mine.yaml")).toBe(false);
      });

      it("replaces it when asked to, leaving a single file", async () => {
        expect(await replace(await chooseAndImport("/downloads/new.yaml"))).toMatchObject({ status: "imported" });
        expect(
          di
            .inject(importedThemesStateInjectable)
            .get()
            .themes.map(({ fileName }) => fileName),
        ).toEqual(["mine.yaml"]);
        expect(di.inject(importedThemesStateInjectable).get().themes[0].theme.spec.displayName).toBe("New");
        expect(await pathExists("/user-data/themes/other-file.yaml")).toBe(false);
      });

      it("keeps everything when the conflict is canceled", async () => {
        const conflict = (await chooseAndImport("/downloads/new.yaml")) as { importId: string };

        expect(await request({ action: "cancel", importId: conflict.importId })).toEqual({ status: "canceled" });
        expect(await request({ action: "replace", importId: conflict.importId })).toEqual({ status: "expired" });
        expect(await readFile("/user-data/themes/other-file.yaml")).toBe(theme("mine", "Old"));
        expect(await pathExists("/user-data/themes/mine.yaml")).toBe(false);
      });
    });

    describe("the confirmation of a conflict", () => {
      beforeEach(async () => {
        await writeFile("/user-data/themes/mine.yaml", theme("mine", "Old"));
        await reload();
      });

      it("imports the file the dialog chose, as it was when chosen", async () => {
        await writeFile("/downloads/new.yaml", theme("mine", "New"));

        const conflict = await chooseAndImport("/downloads/new.yaml");

        await writeFile("/downloads/new.yaml", theme("mine", "Changed since"));
        await writeFile("/downloads/other.yaml", theme("mine", "Other"));
        openPath = "/downloads/other.yaml";
        resetSpies();

        expect(await replace(conflict)).toMatchObject({ status: "imported", displayName: "New" });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "New"));
        expect(showOpenDialog).not.toHaveBeenCalled();
        expect(fileSystem.readFile.mock.calls.map(([filePath]) => filePath)).not.toContain("/downloads/other.yaml");
        expect(fileSystem.readFile.mock.calls.map(([filePath]) => filePath)).not.toContain("/downloads/new.yaml");
      });

      it("is accepted once only", async () => {
        await writeFile("/downloads/new.yaml", theme("mine", "New"));

        const conflict = await chooseAndImport("/downloads/new.yaml");

        expect(await replace(conflict)).toMatchObject({ status: "imported" });
        expect(await replace(conflict)).toEqual({ status: "expired" });
      });

      it("is refused once another import was chosen", async () => {
        await writeFile("/downloads/new.yaml", theme("mine", "New"));
        await writeFile("/downloads/later.yaml", theme("later"));

        const conflict = await chooseAndImport("/downloads/new.yaml");

        await chooseAndImport("/downloads/later.yaml");

        expect(await replace(conflict)).toEqual({ status: "expired" });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "Old"));
      });

      it("asks again when the themes directory changed since the question", async () => {
        await writeFile("/downloads/new.yaml", theme("mine", "New"));

        const conflict = await chooseAndImport("/downloads/new.yaml");

        await writeFile("/user-data/themes/mine.yaml", "not: a theme");

        const asked = await replace(conflict);

        expect(asked).toMatchObject({
          status: "conflict",
          conflicts: [{ kind: "invalid-file", fileName: "mine.yaml" }],
        });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe("not: a theme");
        expect(await replace(asked)).toMatchObject({ status: "imported", displayName: "New" });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "New"));
      });
    });

    describe("into an existing <metadata.name>.yaml", () => {
      beforeEach(async () => {
        await writeFile("/downloads/new.yaml", theme("mine", "New"));
      });

      it.each([
        {
          kind: "a theme of the same name",
          content: theme("mine", "Old"),
          conflict: { kind: "same-name", fileName: "mine.yaml", displayName: "Old" },
        },
        {
          kind: "a theme of another name",
          content: theme("someone-else", "Someone else"),
          conflict: { kind: "other-theme", fileName: "mine.yaml", name: "someone-else", displayName: "Someone else" },
        },
        {
          kind: "an invalid file",
          content: "kind: Theme",
          conflict: {
            kind: "invalid-file",
            fileName: "mine.yaml",
            error: 'Unsupported apiVersion null: expected "freelens.app/v1"',
          },
        },
        {
          kind: "a theme of the same name another file holds as well",
          content: theme("mine", "Shadowed"),
          before: () => writeFile("/user-data/themes/a-first.yaml", theme("mine", "First")),
          conflict: { kind: "same-name", fileName: "mine.yaml", displayName: "Shadowed" },
        },
      ])("asks first when it holds $kind, and says which", async ({ content, conflict, before }) => {
        await before?.();
        await writeFile("/user-data/themes/mine.yaml", content);
        await reload();
        resetSpies();

        const response = await chooseAndImport("/downloads/new.yaml");

        expect(response).toMatchObject({ status: "conflict", fileName: "mine.yaml" });
        expect((response as { conflicts: unknown[] }).conflicts).toContainEqual(conflict);
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(content);
        expect(fileSystem.writeFile).not.toHaveBeenCalled();
        expect(fileSystem.rm).not.toHaveBeenCalled();

        expect(await replace(response)).toMatchObject({ status: "imported", displayName: "New" });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "New"));
        expect(themeNames()).toEqual(["mine"]);
      });

      it("lists both when another file holds the name and the target holds another theme", async () => {
        await writeFile("/user-data/themes/other-file.yaml", theme("mine", "Old"));
        await writeFile("/user-data/themes/mine.yaml", theme("someone-else", "Someone else"));
        await reload();

        expect(await chooseAndImport("/downloads/new.yaml")).toMatchObject({
          status: "conflict",
          conflicts: [
            { kind: "same-name", fileName: "other-file.yaml", displayName: "Old" },
            { kind: "other-theme", fileName: "mine.yaml", name: "someone-else", displayName: "Someone else" },
          ],
        });
      });

      it("asks first even when the themes were not read again since the file appeared", async () => {
        await writeFile("/user-data/themes/mine.yaml", theme("someone-else"));

        expect(await chooseAndImport("/downloads/new.yaml")).toMatchObject({
          status: "conflict",
          conflicts: [{ kind: "other-theme", fileName: "mine.yaml", name: "someone-else" }],
        });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("someone-else"));
      });
    });

    describe.each(hostileNames)("of a theme named %j", (name) => {
      beforeEach(async () => {
        await writeFile("/downloads/hostile.json", jsonTheme(name));
        resetSpies();
      });

      it("is refused with a message, reading only the file the dialog chose and writing nothing", async () => {
        expect(await chooseAndImport("/downloads/hostile.json")).toMatchObject({
          status: "invalid",
          filePath: "/downloads/hostile.json",
          error: expect.stringContaining("metadata.name"),
        });
        expect(fileSystem.readFile.mock.calls.map(([filePath]) => filePath)).toEqual(["/downloads/hostile.json"]);

        for (const method of fileSystemMethods.filter((other) => other !== "readFile")) {
          expect(fileSystem[method]).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe("remove", () => {
    it("removes an imported theme's file", async () => {
      await writeFile("/downloads/mine.yaml", theme("mine"));
      await chooseAndImport("/downloads/mine.yaml");

      expect(await di.inject(removeThemeListenerInjectable).handler("mine")).toEqual({ status: "removed" });
      expect(themeNames()).toEqual([]);
      expect(await pathExists("/user-data/themes/mine.yaml")).toBe(false);
    });

    it.each(["freelens", "ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized"])(
      "does not remove the built-in theme %s",
      async (name) => {
        resetSpies();

        expect(await di.inject(removeThemeListenerInjectable).handler(name)).toEqual({ status: "not-found" });
        expect(fileSystem.rm).not.toHaveBeenCalled();
      },
    );

    it.each(hostileNames)("refuses the name %j without touching the file system", async (name) => {
      resetSpies();

      expect(await di.inject(removeThemeListenerInjectable).handler(name)).toEqual({
        status: "invalid",
        error: expect.stringContaining("is not a theme name"),
      });

      for (const spy of Object.values(fileSystem)) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
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

      expect(await chooseAndImport("/exports/copy.yaml")).toMatchObject({ status: "imported", name: "freelens-copy" });
    });

    it.each(["ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized"])(
      "writes the built-in theme %s as a file that imports back",
      async (name) => {
        savePath = `/exports/${name}.yaml`;

        expect(await di.inject(exportThemeListenerInjectable).handler(name)).toEqual({
          status: "exported",
          filePath: `/exports/${name}.yaml`,
        });

        const exported = await readFile(`/exports/${name}.yaml`);
        const parsed = parseThemeFile(exported);

        expect(parsed.isValid && parsed.theme.metadata.name).toBe(name);

        await writeFile("/exports/copy.yaml", exported.replace(`name: "${name}"`, `name: "my-${name}"`));

        expect(await chooseAndImport("/exports/copy.yaml")).toMatchObject({ status: "imported", name: `my-${name}` });
      },
    );

    it("does nothing when the dialog is canceled", async () => {
      expect(await di.inject(exportThemeListenerInjectable).handler("freelens")).toEqual({ status: "canceled" });
    });

    it.each(hostileNames)("refuses the name %j without touching the file system", async (name) => {
      savePath = "/exports/hostile.yaml";
      resetSpies();

      expect(await di.inject(exportThemeListenerInjectable).handler(name)).toEqual({
        status: "invalid",
        error: expect.stringContaining("is not a theme name"),
      });
      expect(showSaveDialog).not.toHaveBeenCalled();

      for (const spy of Object.values(fileSystem)) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
  });

  describe("the path of a file of the themes directory", () => {
    it("is the file in the themes directory", () => {
      expect(di.inject(getThemeFilePathInjectable)("mine.yaml")).toBe("/user-data/themes/mine.yaml");
    });

    it.each([...hostileNames, ".", "", "a/.", "./a", "mine.yaml/", "../themes/mine.yaml"])("refuses %j", (fileName) => {
      expect(() => di.inject(getThemeFilePathInjectable)(fileName)).toThrow("is not a file of the themes directory");
    });
  });
});
