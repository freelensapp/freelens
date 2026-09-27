/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";

import type { InstalledExtension } from "../installed-extension";

/**
 * `servedUrlOf` is private to the loader, which is the right visibility: only
 * the loader decides what a load is, and the token it mints for a development
 * extension is part of that decision rather than an argument to it.
 */
interface LoaderUrls {
  servedUrlOf(extension: InstalledExtension, fileSegments: string[]): string;
}

const extensionsRoot = "/some-directory-for-user-data/extensions";

const managedExtension: InstalledExtension = {
  id: "@freelensapp/helloworld",
  absolutePath: `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c`,
  manifestPath: `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c/package.json`,
  manifest: {
    name: "@freelensapp/helloworld",
    version: "1.0.0",
    engines: { freelens: "^2.0.0" },
  },
  isCompatible: true,
  isManaged: true,
  isVerified: true,
  isEnabled: true,
};

const developmentExtension: InstalledExtension = {
  ...managedExtension,
  id: "my-extension",
  absolutePath: "/home/someone/src/my-extension",
  manifestPath: "/home/someone/src/my-extension/package.json",
  manifest: { name: "my-extension", version: "0.1.0", engines: { freelens: "^2.0.0" } },
  isManaged: false,
  isVerified: false,
};

describe("the URLs the renderer loads an extension from", () => {
  let urls: LoaderUrls;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(currentlyInClusterFrameInjectable, () => false);
    di.override(getRandomIdInjectionToken, () => () => "a-token");

    urls = di.inject(extensionLoaderInjectable) as unknown as LoaderUrls;
  });

  it("addresses a managed build by the directory it lives in", () => {
    expect(urls.servedUrlOf(managedExtension, ["dist", "renderer.js"])).toBe(
      "freelens-extension://extensions/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/renderer.js",
    );
  });

  it("addresses a development install by a load token, since its content changes without a version", () => {
    expect(urls.servedUrlOf(developmentExtension, ["out", "renderer.js"])).toBe(
      "freelens-extension://extensions/my-extension/dev-a-token/out/renderer.js",
    );
  });

  it("gives every file of one load the same token, so a relative import resolves to the same module", () => {
    let mintedTokens = 0;

    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(currentlyInClusterFrameInjectable, () => false);
    di.override(getRandomIdInjectionToken, () => () => `token-${++mintedTokens}`);

    const loader = di.inject(extensionLoaderInjectable) as unknown as LoaderUrls;

    expect(loader.servedUrlOf(developmentExtension, ["out", "renderer.js"])).toContain("/dev-token-1/");
    expect(loader.servedUrlOf(developmentExtension, ["out", "renderer.css"])).toContain("/dev-token-1/");
    expect(mintedTokens).toBe(1);
  });
});
