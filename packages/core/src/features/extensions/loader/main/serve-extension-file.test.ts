/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import readFileBufferInjectable from "../../../../common/fs/read-file-buffer.injectable";
import realPathInjectable from "../../../../common/fs/realpath.injectable";
import { getDiForUnitTesting } from "../../../../main/getDiForUnitTesting";
import installedExtensionsStateInjectable from "../../installer/common/installed-extensions-state.injectable";
import serveExtensionFileInjectable from "./serve-extension-file.injectable";

import type { InstalledExtensionEntry } from "../../installer/common/installed-extensions";
import type { ServeExtensionFile } from "./serve-extension-file.injectable";

const extensionsRoot = "/some-directory-for-user-data/extensions";
const liveBuild = `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c`;
const developmentDirectory = "/home/someone/src/my-extension";

describe("serveExtensionFile", () => {
  let serveExtensionFile: ServeExtensionFile;
  let installedExtensions: Map<string, InstalledExtensionEntry>;
  let files: Map<string, string>;
  let symlinks: Map<string, string>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    files = new Map();
    symlinks = new Map();

    di.override(realPathInjectable, () => async (path: string) => {
      const target = symlinks.get(path);

      if (target) {
        return target;
      }

      if (!files.has(path) && ![...files.keys()].some((file) => file.startsWith(`${path}/`))) {
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
      }

      return path;
    });

    di.override(readFileBufferInjectable, () => async (path: string) => {
      const contents = files.get(path);

      if (contents === undefined) {
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: "ENOENT" });
      }

      return Buffer.from(contents);
    });

    installedExtensions = di.inject(installedExtensionsStateInjectable);
    serveExtensionFile = di.inject(serveExtensionFileInjectable);
  });

  const request = (url: string) => serveExtensionFile(new Request(url));

  describe("a managed install", () => {
    beforeEach(() => {
      installedExtensions.set("@freelensapp/helloworld", {
        name: "@freelensapp/helloworld",
        path: liveBuild,
        version: "1.0.0",
        digest: "0f1e2d3c",
        verified: true,
      });
      files.set(`${liveBuild}/dist/renderer.js`, "export default class {}");
    });

    it("serves the file with a JavaScript content type", async () => {
      const response = await request(
        "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/renderer.js",
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
      await expect(response.text()).resolves.toBe("export default class {}");
    });

    it("sends no CORS header, which the corsEnabled scheme does not need", async () => {
      const response = await request(
        "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/renderer.js",
      );

      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("refuses a build which is on disk but is not the live one", async () => {
      files.set(`${extensionsRoot}/freelensapp--helloworld/0.9.0-aabbccdd/dist/renderer.js`, "the old build");

      const response = await request(
        "freelens-extension://extensions/freelensapp--helloworld/0.9.0-aabbccdd/dist/renderer.js",
      );

      expect(response.status).toBe(404);
    });

    it("refuses an extension which is not installed", async () => {
      const response = await request("freelens-extension://extensions/someone--else/1.0.0-0f1e2d3c/dist/renderer.js");

      expect(response.status).toBe(404);
    });

    it("refuses a file which is not there", async () => {
      const response = await request(
        "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/missing.js",
      );

      expect(response.status).toBe(404);
    });

    it("refuses a symlink pointing out of the extension", async () => {
      symlinks.set(`${liveBuild}/dist/escape.js`, "/etc/shadow");
      files.set("/etc/shadow", "not yours");

      const response = await request(
        "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/escape.js",
      );

      expect(response.status).toBe(403);
    });

    it("follows a symlink which stays inside the extension", async () => {
      symlinks.set(`${liveBuild}/dist/aliased.js`, `${liveBuild}/dist/renderer.js`);

      const response = await request(
        "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/aliased.js",
      );

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("export default class {}");
    });

    it("refuses a malformed URL", async () => {
      const response = await request("freelens-extension://extensions/freelensapp--helloworld");

      expect(response.status).toBe(400);
    });
  });

  describe("a development install", () => {
    beforeEach(() => {
      installedExtensions.set("my-extension", {
        name: "my-extension",
        path: developmentDirectory,
        verified: false,
      });
      files.set(`${developmentDirectory}/out/renderer.js`, "the extension being written");
    });

    it("serves from the directory the registry records, not from the root", async () => {
      const response = await request("freelens-extension://extensions/my-extension/dev-a-token/out/renderer.js");

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("the extension being written");
    });

    it("serves any load token, because there is only ever one directory", async () => {
      const response = await request("freelens-extension://extensions/my-extension/dev-another-token/out/renderer.js");

      expect(response.status).toBe(200);
    });

    it("refuses a segment which is not a load token", async () => {
      const response = await request("freelens-extension://extensions/my-extension/1.0.0-0f1e2d3c/out/renderer.js");

      expect(response.status).toBe(404);
    });
  });
});
