/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fetchInjectable from "../../common/fetch/fetch.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import readFileInjectable from "../../common/fs/read-file.injectable";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";

import type { Fetch, FetchResponse } from "@freelensapp/json-api";

import type { PathExists } from "../../common/fs/path-exists.injectable";
import type { ReadFile } from "../../common/fs/read-file.injectable";
import type { InstalledExtension } from "../installed-extension";

/**
 * `injectRendererStyles` is private to the loader: nothing outside it decides
 * when an extension's stylesheet is linked. What is asserted here is the route
 * it takes to find out whether there is one.
 */
interface LoaderStyles {
  injectRendererStyles(extension: InstalledExtension, entryPointSegments: string[]): Promise<void>;
}

const extensionsRoot = "/some-directory-for-user-data/extensions";

const extension: InstalledExtension = {
  id: "@freelensapp/helloworld",
  absolutePath: `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c`,
  manifestPath: `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c/package.json`,
  manifest: {
    name: "@freelensapp/helloworld",
    version: "1.0.0",
    engines: { freelens: "^2.0.0" },
    renderer: "dist/renderer.js",
  },
  isCompatible: true,
  isManaged: true,
  isVerified: true,
  isEnabled: true,
};

const servedPrefix = "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c";

// Read through the attribute rather than `link.href`, which resolves against
// the document's base URL and is jsdom's business rather than the loader's.
const linkedStylesheets = () =>
  Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), (link) =>
    link.getAttribute("href"),
  );

describe("linking an extension's renderer stylesheet", () => {
  let styles: LoaderStyles;
  let fetchMock: ReturnType<typeof vi.fn>;
  let pathExistsMock: ReturnType<typeof vi.fn>;
  let readFileMock: ReturnType<typeof vi.fn>;

  // Which URLs main is pretending to have a file for. Everything else is
  // answered the way the handler answers a file it cannot find.
  let servedUrls: Set<string>;

  beforeEach(() => {
    document.head.innerHTML = "";
    servedUrls = new Set();

    const di = getDiForUnitTesting();

    fetchMock = vi.fn(
      async (url: string | URL): Promise<FetchResponse> =>
        (servedUrls.has(String(url))
          ? { ok: true, status: 200 }
          : { ok: false, status: 404 }) as unknown as FetchResponse,
    );
    pathExistsMock = vi.fn(async () => true);
    readFileMock = vi.fn(async () => "");

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(currentlyInClusterFrameInjectable, () => false);
    di.override(getRandomIdInjectionToken, () => () => "a-token");
    di.override(fetchInjectable, () => fetchMock as unknown as Fetch);
    di.override(pathExistsInjectable, () => pathExistsMock as unknown as PathExists);
    di.override(readFileInjectable, () => readFileMock as unknown as ReadFile);

    styles = di.inject(extensionLoaderInjectable) as unknown as LoaderStyles;
  });

  it("links the stylesheet main serves next to the entry point", async () => {
    servedUrls.add(`${servedPrefix}/dist/renderer.css`);

    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);

    expect(linkedStylesheets()).toEqual([`${servedPrefix}/dist/renderer.css`]);
  });

  it("asks the scheme whether the stylesheet is there, and never the filesystem", async () => {
    servedUrls.add(`${servedPrefix}/dist/renderer.css`);

    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);

    // The renderer has to work without filesystem privileges (#2399), which is
    // the whole reason extensions are served over a URL. A probe which reads an
    // absolute path off disk takes that back.
    expect(fetchMock).toHaveBeenCalledWith(`${servedPrefix}/dist/renderer.css`);
    expect(pathExistsMock).not.toHaveBeenCalled();
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("falls back to Vite's default library CSS asset name", async () => {
    servedUrls.add(`${servedPrefix}/dist/style.css`);

    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);

    expect(linkedStylesheets()).toEqual([`${servedPrefix}/dist/style.css`]);
  });

  it("links nothing for the majority of extensions, which ship no stylesheet", async () => {
    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);

    expect(linkedStylesheets()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks the link with the extension it belongs to", async () => {
    servedUrls.add(`${servedPrefix}/dist/renderer.css`);

    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);

    const link = document.head.querySelector<HTMLLinkElement>('link[rel="stylesheet"]');

    expect(link?.dataset.freelensExtension).toBe("@freelensapp/helloworld");
  });

  it("links one URL once, however often the extension is loaded", async () => {
    servedUrls.add(`${servedPrefix}/dist/renderer.css`);

    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);
    await styles.injectRendererStyles(extension, ["dist", "renderer.js"]);

    expect(linkedStylesheets()).toEqual([`${servedPrefix}/dist/renderer.css`]);
  });

  it("links one URL once when two loads race, since the probe is asynchronous", async () => {
    servedUrls.add(`${servedPrefix}/dist/renderer.css`);

    await Promise.all([
      styles.injectRendererStyles(extension, ["dist", "renderer.js"]),
      styles.injectRendererStyles(extension, ["dist", "renderer.js"]),
    ]);

    expect(linkedStylesheets()).toEqual([`${servedPrefix}/dist/renderer.css`]);
  });
});
