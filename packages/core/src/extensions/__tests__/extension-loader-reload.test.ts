/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getRandomIdInjectionToken } from "@freelensapp/random";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting as getMainDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { getDiForUnitTesting as getRendererDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import extensionInjectable from "../extension-loader/extension/extension.injectable";
import extensionInstancesInjectable from "../extension-loader/extension-instances.injectable";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";

import type { ObservableMap } from "mobx";

import type { ExtensionLoader } from "../extension-loader";
import type { InstalledExtension, LensExtensionId, LensExtensionInstance } from "../installed-extension";

/**
 * The URL helpers are private to the loader, which is the right visibility:
 * only the loader decides what a load is. What is asserted through them here is
 * that a reload is a different load.
 */
interface LoaderUrls {
  servedUrlOf(extension: InstalledExtension, fileSegments: string[]): string;
  fileUrlOf(extension: InstalledExtension, entryPointPath: string): string;
  /** The URLs the loader believes it has already linked a stylesheet at. */
  injectedStyleUrls: Set<string>;
}

const linkStylesheet = (extensionName: string, url: string) => {
  const link = document.createElement("link");

  link.rel = "stylesheet";
  link.href = url;
  link.dataset.freelensExtension = extensionName;
  document.head.appendChild(link);

  return link;
};

const linkedStylesheets = () =>
  Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), (link) =>
    link.getAttribute("href"),
  );

const extensionsRoot = "/some-directory-for-user-data/extensions";

const managedExtension: InstalledExtension = {
  id: "@freelensapp/helloworld",
  absolutePath: `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c`,
  manifestPath: `${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c/package.json`,
  manifest: {
    name: "@freelensapp/helloworld",
    version: "1.0.0",
    engines: { freelens: "^2.0.0" },
    main: "dist/main.js",
  },
  isCompatible: true,
  isManaged: true,
  isVerified: true,
  isEnabled: true,
};

const developmentExtension: InstalledExtension = {
  id: "my-extension",
  absolutePath: "/home/someone/src/my-extension",
  manifestPath: "/home/someone/src/my-extension/package.json",
  // No entry point for either process, so a reload is only the teardown and the
  // new token: importing an extension which does not exist is not what is under
  // test here.
  manifest: { name: "my-extension", version: "0.1.0", engines: { freelens: "^2.0.0" } },
  isCompatible: true,
  isManaged: false,
  isVerified: false,
  isEnabled: true,
};

const fakeInstanceOf = (extension: InstalledExtension) => {
  const disable = vi.fn(async () => {});

  return {
    disable,
    instance: {
      id: extension.id,
      name: extension.manifest.name,
      version: extension.manifest.version,
      manifest: extension.manifest,
      manifestPath: extension.manifestPath,
      sanitizedExtensionId: extension.id,
      description: undefined,
      storeName: extension.manifest.name,
      getExtensionFileFolder: async () => extension.absolutePath,
      enable: async () => {},
      disable,
      activate: async () => {},
    } as LensExtensionInstance,
  };
};

describe("reloading a development extension in the renderer", () => {
  let extensionLoader: ExtensionLoader;
  let urls: LoaderUrls;
  let extensionInstances: ObservableMap<LensExtensionId, LensExtensionInstance>;
  let deregister: ReturnType<typeof vi.fn>;
  let mintedTokens: number;

  beforeEach(() => {
    mintedTokens = 0;
    deregister = vi.fn();
    document.head.innerHTML = "";

    const di = getRendererDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(currentlyInClusterFrameInjectable, () => false);
    di.override(getRandomIdInjectionToken, () => () => `token-${++mintedTokens}`);
    // A keyed singleton: the override stands in for every instance's
    // registration handle, which is what a reload has to take back out.
    di.override(extensionInjectable as never, (() => ({ register: () => {}, deregister })) as never);

    extensionInstances = di.inject(extensionInstancesInjectable);
    extensionLoader = di.inject(extensionLoaderInjectable);
    urls = extensionLoader as unknown as LoaderUrls;
  });

  it("serves the reloaded build under a new token, which is how the new code is reached", async () => {
    extensionLoader.addExtension(developmentExtension);

    const before = urls.servedUrlOf(developmentExtension, ["out", "renderer.js"]);

    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, "token-after");

    expect(before).toContain("/dev-token-1/");
    expect(urls.servedUrlOf(developmentExtension, ["out", "renderer.js"])).toContain("/dev-token-after/");
  });

  it("tears the previous instance down before importing again", async () => {
    const { instance, disable } = fakeInstanceOf(developmentExtension);

    extensionLoader.addExtension(developmentExtension);
    extensionInstances.set(developmentExtension.id, instance);

    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, "token-after");

    // `disable()` is what awaits `onDeactivate` and runs the extension's
    // disposers; `deregister()` takes its registrations back out.
    expect(disable).toHaveBeenCalled();
    expect(deregister).toHaveBeenCalled();
    expect(extensionInstances.has(developmentExtension.id)).toBe(false);
  });

  it("refuses to reload a managed extension, whose content cannot change without a new install", async () => {
    const { instance, disable } = fakeInstanceOf(managedExtension);

    extensionLoader.addExtension(managedExtension);
    extensionInstances.set(managedExtension.id, instance);

    await extensionLoader.reloadDevelopmentExtension(managedExtension.id, "token-after");

    expect(disable).not.toHaveBeenCalled();
    expect(extensionInstances.has(managedExtension.id)).toBe(true);
  });

  it("does nothing for an extension which is not installed", async () => {
    await extensionLoader.reloadDevelopmentExtension("not-installed", "token-after");

    expect(extensionInstances.size).toBe(0);
  });

  it("takes the previous build's stylesheets out of the document", async () => {
    const staleUrl = "freelens-extension://extensions/my-extension/dev-token-1/out/renderer.css";

    extensionLoader.addExtension(developmentExtension);
    linkStylesheet(developmentExtension.manifest.name, staleUrl);
    urls.injectedStyleUrls.add(staleUrl);

    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, "token-after");

    // The stale URL still resolves -- the handler accepts any development token
    // -- so a stylesheet left behind would go on applying its rules.
    expect(linkedStylesheets()).toEqual([]);
    // And is forgotten, or the extension could never link that URL again.
    expect(urls.injectedStyleUrls.has(staleUrl)).toBe(false);
  });

  it("leaves another extension's stylesheets alone", async () => {
    extensionLoader.addExtension(developmentExtension);
    linkStylesheet("another-extension", "freelens-extension://extensions/another-extension/1.0.0-0f1e2d3c/style.css");

    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, "token-after");

    expect(linkedStylesheets()).toEqual(["freelens-extension://extensions/another-extension/1.0.0-0f1e2d3c/style.css"]);
  });

  it("mints its own token when nothing handed it one, which is the main-process path", async () => {
    extensionLoader.addExtension(developmentExtension);
    urls.servedUrlOf(developmentExtension, ["out", "renderer.js"]);

    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id);

    expect(urls.servedUrlOf(developmentExtension, ["out", "renderer.js"])).toContain("/dev-token-2/");
  });
});

describe("the file: URL main imports an extension from", () => {
  let urls: LoaderUrls;

  beforeEach(() => {
    const di = getMainDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(getRandomIdInjectionToken, () => () => "a-token");

    urls = di.inject(extensionLoaderInjectable) as unknown as LoaderUrls;
  });

  it("is the plain path of a managed build, which a new install moves", () => {
    expect(urls.fileUrlOf(managedExtension, "dist/main.js")).toBe(
      `file://${extensionsRoot}/freelensapp--helloworld/1.0.0-0f1e2d3c/dist/main.js`,
    );
  });

  it("carries the load token of a development install, whose path does not move", () => {
    expect(urls.fileUrlOf(developmentExtension, "dist/main.js")).toBe(
      "file:///home/someone/src/my-extension/dist/main.js?v=a-token",
    );
  });

  it("uses the same token as the renderer for one load, because it is one reload", () => {
    expect(urls.servedUrlOf(developmentExtension, ["dist", "renderer.js"])).toContain("/dev-a-token/");
    expect(urls.fileUrlOf(developmentExtension, "dist/main.js")).toContain("?v=a-token");
  });
});
