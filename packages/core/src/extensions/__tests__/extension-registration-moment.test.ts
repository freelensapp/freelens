/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The lifecycle invariant of the DI surface (#2450, part 3): *the extension's
// container view exists before the author's first hook and is released after
// their last.*
//
// It used to hold at neither end of activation. The view came into existence
// with the first `getExtension` call, which was in `loadExtensions` -- after
// `activate()` had already run the author's `onActivate` -- so there was no
// point in the lifecycle at which an extension could register an injectable.
// Population of the view still follows activation, and has to: an `onActivate`
// can register catalog categories the host's registrators need to see.
//
// Asserted as an order rather than a set of calls, because the ordering is the
// whole content of the invariant.

import { getRandomIdInjectionToken } from "@freelensapp/random";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import extensionInjectable from "../extension-loader/extension/extension.injectable";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";

import type { ExtensionLoader } from "../extension-loader";
import type { InstalledExtension, LensExtensionConstructor } from "../installed-extension";

const developmentExtension: InstalledExtension = {
  id: "my-extension",
  absolutePath: "/home/someone/src/my-extension",
  manifestPath: "/home/someone/src/my-extension/package.json",
  manifest: {
    name: "my-extension",
    version: "0.1.0",
    engines: { freelens: "^2.0.0" },
    renderer: "dist/renderer.js",
  },
  isCompatible: true,
  isManaged: false,
  isVerified: false,
  isEnabled: true,
};

describe("the moment an extension's container view exists", () => {
  let extensionLoader: ExtensionLoader;
  let lifecycle: string[];

  beforeEach(() => {
    lifecycle = [];

    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(currentlyInClusterFrameInjectable, () => false);
    di.override(getRandomIdInjectionToken, () => () => "token");
    // Instantiating this injectable *is* creating the view, so the override
    // records that rather than the registration it hands back.
    di.override(
      extensionInjectable as never,
      ((): unknown => {
        lifecycle.push("container view created");

        return {
          register: () => lifecycle.push("registrators populate the view"),
          deregister: () => lifecycle.push("view released"),
        };
      }) as never,
    );

    extensionLoader = di.inject(extensionLoaderInjectable);

    // Standing in for importing the extension's entry point, which is the only
    // part of this path that touches the filesystem.
    class FakeExtension {
      activate = async () => void lifecycle.push("onActivate");
      enable = async () => void lifecycle.push("enable");
      disable = async () => void lifecycle.push("onDeactivate");
      readonly id = developmentExtension.id;
      readonly name = developmentExtension.manifest.name;
      readonly sanitizedExtensionId = "my-extension";
    }

    vi.spyOn(
      extensionLoader as unknown as {
        requireExtension: () => Promise<LensExtensionConstructor | null>;
      },
      "requireExtension",
    ).mockResolvedValue(FakeExtension as unknown as LensExtensionConstructor);
  });

  it("creates the view before the author's first hook and populates it after", async () => {
    extensionLoader.addExtension(developmentExtension);

    // The reload path is `loadUserExtensions` followed by `loadExtensions`, with
    // nothing else in it; a first load runs the same two.
    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, "token");

    expect(lifecycle).toEqual(["container view created", "onActivate", "registrators populate the view", "enable"]);
  });

  it("releases the view after the author's last hook", async () => {
    extensionLoader.addExtension(developmentExtension);

    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, "token");

    lifecycle.length = 0;

    extensionLoader.removeInstance(developmentExtension.id);

    expect(lifecycle).toEqual(["onDeactivate", "view released"]);
  });
});
