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
import proxyFetchInjectable from "../../../../../main/fetch/proxy-fetch.injectable";
import { getDiForUnitTesting } from "../../../../../main/getDiForUnitTesting";
import { maxThemeFileSize, themeFileTooLargeError } from "../../common/import-source";
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
  let respond: (url: string) => Response | Promise<Response>;
  let fetch: ReturnType<typeof vi.fn>;

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
  const importFromUrl = (url: string) => request({ action: "url", url });
  const resetSpies = () => {
    showOpenDialog.mockClear();
    showSaveDialog.mockClear();
    fetch.mockClear();
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
    respond = () => {
      throw new Error("No network in the tests");
    };
    fetch = vi.fn(async (url: string) => respond(url));
    di.override(proxyFetchInjectable, () => fetch as never);

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

    it.each(["freelens", "ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized", "high-contrast"])(
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

      it("downloads the URL of the request, not a path it carries", async () => {
        respond = () => new Response(theme("downloaded"));

        const response = await request({
          action: "url",
          url: "https://example.com/downloaded.yaml",
          filePath: "/secret/id_ed25519",
        } as never);

        expect(response).toMatchObject({ status: "imported", name: "downloaded" });
        expect(showOpenDialog).not.toHaveBeenCalled();
        expect(readPaths()).not.toContain("/secret/id_ed25519");
        expect(fileSystem.stat).not.toHaveBeenCalled();
      });

      it("opens the dialog on choose, whatever URL the request carries", async () => {
        await writeFile("/downloads/chosen.yaml", theme("chosen"));
        openPath = "/downloads/chosen.yaml";

        expect(await request({ action: "choose", url: "https://example.com/other.yaml" } as never)).toMatchObject({
          status: "imported",
          name: "chosen",
        });
        expect(fetch).not.toHaveBeenCalled();
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

    describe("of a file over the size limit", () => {
      it("is refused without being read", async () => {
        await writeFile("/downloads/large.yaml", `${theme("large")}#${"x".repeat(maxThemeFileSize)}\n`);
        resetSpies();

        expect(await chooseAndImport("/downloads/large.yaml")).toEqual({
          status: "invalid",
          source: "/downloads/large.yaml",
          error: themeFileTooLargeError,
        });
        expect(fileSystem.readFile).not.toHaveBeenCalled();
        expect(themeNames()).toEqual([]);
      });

      it("is imported when it is exactly the limit", async () => {
        const content = theme("exact");
        const padded = `${content}#${"x".repeat(maxThemeFileSize - content.length - 2)}\n`;

        expect(padded.length).toBe(maxThemeFileSize);
        await writeFile("/downloads/exact.yaml", padded);

        expect(await chooseAndImport("/downloads/exact.yaml")).toMatchObject({ status: "imported", name: "exact" });
      });

      it("refuses what is not a regular file without reading it", async () => {
        await writeFile("/downloads/directory/theme.yaml", theme("inside"));
        resetSpies();

        expect(await chooseAndImport("/downloads/directory")).toEqual({
          status: "invalid",
          source: "/downloads/directory",
          error: "The theme is not a regular file",
        });
        expect(fileSystem.readFile).not.toHaveBeenCalled();
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
          source: "/downloads/hostile.json",
          error: expect.stringContaining("metadata.name"),
        });
        expect(fileSystem.readFile.mock.calls.map(([filePath]) => filePath)).toEqual(["/downloads/hostile.json"]);
        expect(fileSystem.stat.mock.calls.map(([filePath]) => filePath)).toEqual(["/downloads/hostile.json"]);

        for (const method of fileSystemMethods.filter((other) => other !== "readFile" && other !== "stat")) {
          expect(fileSystem[method]).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe("import from a URL", () => {
    /**
     * A body that never ends: only a size limit or an abort finishes reading it.
     */
    const endlessBody = () => {
      const body = {
        pulled: 0,
        canceled: false,
        stream: new ReadableStream<Uint8Array>({
          pull: (controller) => {
            body.pulled++;
            controller.enqueue(new Uint8Array(4096).fill(0x23));
          },
          cancel: () => {
            body.canceled = true;
          },
        }),
      };

      return body;
    };

    it.each(["https://example.com/themes/mine.yaml", "http://example.com/themes/mine.json"])(
      "copies the theme %s gives as <metadata.name>.yaml, comments included",
      async (url) => {
        respond = () => new Response(theme("mine"));

        expect(await importFromUrl(url)).toEqual({
          status: "imported",
          name: "mine",
          displayName: "mine",
          unknownTokens: [],
        });
        expect(fetch).toHaveBeenCalledWith(url, expect.anything());
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine"));
        expect(themeNames()).toEqual(["mine"]);
        expect(showOpenDialog).not.toHaveBeenCalled();
      },
    );

    it.each([
      "file:///secret/id_ed25519",
      "ftp://example.com/mine.yaml",
      "data:text/plain,kind: Theme",
      "javascript:alert(1)",
      "/secret/id_ed25519",
      "not a url",
      "",
    ])("refuses %j without downloading or reading anything", async (url) => {
      await writeFile("/secret/id_ed25519", privateKey);
      resetSpies();

      expect(await importFromUrl(url)).toMatchObject({ status: "invalid", source: url });
      expect(fetch).not.toHaveBeenCalled();

      for (const spy of Object.values(fileSystem)) {
        expect(spy).not.toHaveBeenCalled();
      }
    });

    it.each([undefined, 42, { href: "https://example.com/mine.yaml" }])(
      "refuses the URL %j that is not a string, without downloading anything",
      async (url) => {
        expect(await request({ action: "url", url } as never)).toMatchObject({
          status: "invalid",
          error: "The URL of a theme must be a string",
        });
        expect(fetch).not.toHaveBeenCalled();
      },
    );

    it("refuses a download that fails", async () => {
      respond = () => {
        throw new Error("getaddrinfo ENOTFOUND example.com");
      };

      expect(await importFromUrl("https://example.com/mine.yaml")).toEqual({
        status: "invalid",
        source: "https://example.com/mine.yaml",
        error: expect.stringMatching(/^The theme cannot be downloaded: .*ENOTFOUND/),
      });
      expect(themeNames()).toEqual([]);
    });

    it("refuses a response that is not a success", async () => {
      respond = () => new Response("Not here", { status: 404, statusText: "Not Found" });

      expect(await importFromUrl("https://example.com/mine.yaml")).toEqual({
        status: "invalid",
        source: "https://example.com/mine.yaml",
        error: "The theme cannot be downloaded: Not Found",
      });
    });

    it("refuses an invalid theme", async () => {
      respond = () => new Response("<html>a page, not a theme</html>");

      expect(await importFromUrl("https://example.com/mine.yaml")).toMatchObject({
        status: "invalid",
        source: "https://example.com/mine.yaml",
      });
      expect(themeNames()).toEqual([]);
    });

    it("refuses the name of a built-in theme", async () => {
      respond = () => new Response(theme("freelens"));

      expect(await importFromUrl("https://example.com/freelens.yaml")).toMatchObject({
        status: "invalid",
        error: expect.stringContaining("a built-in theme"),
      });
    });

    it.each(hostileNames)("refuses the name %j, writing nothing", async (name) => {
      respond = () => new Response(jsonTheme(name));
      resetSpies();

      expect(await importFromUrl("https://example.com/hostile.json")).toMatchObject({
        status: "invalid",
        error: expect.stringContaining("metadata.name"),
      });

      for (const spy of Object.values(fileSystem)) {
        expect(spy).not.toHaveBeenCalled();
      }
    });

    describe("over the size limit", () => {
      it("is refused by its content-length, without reading the body", async () => {
        const body = endlessBody();

        respond = () => new Response(body.stream, { headers: { "content-length": String(maxThemeFileSize + 1) } });

        expect(await importFromUrl("https://example.com/large.yaml")).toEqual({
          status: "invalid",
          source: "https://example.com/large.yaml",
          error: themeFileTooLargeError,
        });
        expect(body.canceled).toBe(true);
        expect(fileSystem.writeFile).not.toHaveBeenCalled();
      });

      it.each<{ header: string; headers: Record<string, string> }>([
        { header: "without a content-length", headers: {} },
        { header: "with a content-length that understates it", headers: { "content-length": "100" } },
      ])("is aborted as soon as it passes the limit, $header", async ({ headers }) => {
        const body = endlessBody();

        respond = () => new Response(body.stream, { headers });

        expect(await importFromUrl("https://example.com/large.yaml")).toEqual({
          status: "invalid",
          source: "https://example.com/large.yaml",
          error: themeFileTooLargeError,
        });
        expect(body.canceled).toBe(true);
        // The stream may read a few chunks ahead, but stops close to the limit.
        expect(body.pulled * 4096).toBeLessThan(maxThemeFileSize * 2);
        expect(fileSystem.writeFile).not.toHaveBeenCalled();
      });

      it("is imported when it is exactly the limit", async () => {
        const content = theme("exact");
        const padded = `${content}#${"x".repeat(maxThemeFileSize - content.length - 2)}\n`;

        respond = () => new Response(padded);

        expect(await importFromUrl("https://example.com/exact.yaml")).toMatchObject({
          status: "imported",
          name: "exact",
        });
      });
    });

    describe("of a theme whose name another file holds", () => {
      beforeEach(async () => {
        await writeFile("/user-data/themes/mine.yaml", theme("mine", "Old"));
        await reload();
        respond = () => new Response(theme("mine", "New"));
      });

      it("asks before replacing it, and replaces it with the download as it was then", async () => {
        const conflict = await importFromUrl("https://example.com/mine.yaml");

        expect(conflict).toMatchObject({
          status: "conflict",
          name: "mine",
          displayName: "New",
          conflicts: [{ kind: "same-name", fileName: "mine.yaml", displayName: "Old" }],
        });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "Old"));

        respond = () => new Response(theme("mine", "Changed since"));
        resetSpies();

        expect(await replace(conflict)).toMatchObject({ status: "imported", displayName: "New" });
        expect(fetch).not.toHaveBeenCalled();
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "New"));
      });

      it("keeps everything when the conflict is canceled", async () => {
        const conflict = (await importFromUrl("https://example.com/mine.yaml")) as { importId: string };

        expect(await request({ action: "cancel", importId: conflict.importId })).toEqual({ status: "canceled" });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "Old"));
      });

      it("is refused once another import was started", async () => {
        const conflict = await importFromUrl("https://example.com/mine.yaml");

        await importFromUrl("ftp://example.com/other.yaml");

        expect(await replace(conflict)).toEqual({ status: "expired" });
        expect(await readFile("/user-data/themes/mine.yaml")).toBe(theme("mine", "Old"));
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

    it.each(["freelens", "ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized", "high-contrast"])(
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

    it.each(["ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized", "high-contrast"])(
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
