/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// The unit level of the extension contract (#2451). It loads the built bundle
// of `@freelensapp/fixture-extension` — an extension written the way a
// third-party extension is written, against the published
// `dist/extension-api.d.ts` and with its externals mapped onto
// `globalThis.FreelensExtensionApi` — and asserts the four things that break
// silently and that a hand-written list of `toHaveProperty` calls cannot see:
//
//  1. instance identity of React: a hook in the extension's component only
//     works if the host's React is the one the bundle got off the global
//  2. instance identity of mobx: asserted directly, because nothing else here
//     can see it. Two copies of mobx 6 keep interoperating through the global
//     state they share on `globalThis`, so the host goes on reacting to the box
//     the extension mutates and every behavioural assertion below stays green
//     while the extension carries a duplicate. The reactivity is asserted all
//     the same — it is the statement of the contract — and from inside an
//     `autorun`, because an unobserved computed re-evaluates on every `.get()`
//     and would pass without tracking anything at all
//  3. the lifecycle: the declarative registration reaches the host only through
//     the registrators and `extension.register()`
//  4. `Renderer.Util.fetch`: the API namespace reaches the host's DI container
//
// The bundle is loaded through a file URL rather than a static import for two
// reasons: it throws while evaluating if the globals are not installed first
// (which is the contract, and so has to happen inside the test), and the
// specifier must not be resolved by TypeScript, which would type-check a build
// artifact.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fireEvent, render } from "@testing-library/react";
import { autorun, observable, runInAction } from "mobx";
import React from "react";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import isFlatpakPackageInjectable from "../../common/vars/is-flatpak-package.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import statusBarItemsInjectable from "../../renderer/components/status-bar/status-bar-items.injectable";
import browserFetchInjectable from "../../renderer/fetch/browser-fetch.injectable";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import { installExtensionApiGlobals } from "../../test-utils/install-extension-api-globals";
import extensionInjectable from "../extension-loader/extension/extension.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IObservableValue } from "mobx";

import type { StatusBarItems } from "../../renderer/components/status-bar/status-bar-items.injectable";
import type { InstalledExtension } from "../installed-extension";
import type { LensRendererExtension } from "../lens-renderer-extension";

interface FixtureBundle {
  default: new (extension: InstalledExtension) => LensRendererExtension;
  FIXTURE_PROBE_URL: string;
  FixtureStatusBarItem: React.ComponentType;
  activationRecord: IObservableValue<{ appVersion: string; probeStatus: number } | undefined>;
  setStatusBarItemVisible: (value: boolean) => void;
  resolvedMobxObservable: typeof observable;
  resolvedReactUseState: typeof React.useState;
}

const fixtureBundlePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixture-extension/dist/renderer.js",
);

const EXTENSION_NAME = "freelens-fixture-extension";

const installedFixture: InstalledExtension = {
  id: EXTENSION_NAME,
  absolutePath: "/irrelevant",
  manifestPath: "/irrelevant/package.json",
  manifest: {
    name: EXTENSION_NAME,
    version: "2.0.0-0",
    renderer: "./dist/renderer.js",
    engines: { freelens: "^2.0.0" },
  },
  isCompatible: true,
  isEnabled: true,
};

const importFixtureBundle = async (): Promise<FixtureBundle> => {
  if (!existsSync(fixtureBundlePath)) {
    throw new Error(
      `The contract fixture is not built. Run \`pnpm --filter @freelensapp/fixture-extension build\` (or \`pnpm build\`) before this suite; expected ${fixtureBundlePath}`,
    );
  }

  return (await import(/* @vite-ignore */ pathToFileURL(fixtureBundlePath).href)) as FixtureBundle;
};

describe("extension contract, against the built fixture extension", () => {
  let di: DiContainer;
  let fixture: FixtureBundle;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    di = getDiForUnitTesting();
    di.override(buildVersionInitializable.stateToken, () => "1.2.3");
    di.override(isFlatpakPackageInjectable, () => false);
    // Reads `process.isMainFrame`, which only Electron defines; every renderer
    // extension instance injects it through `navigate-to-route`.
    di.override(currentlyInClusterFrameInjectable, () => false);
    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    fetchMock = vi.fn(async () => ({ ok: true, status: 204 }));
    di.override(browserFetchInjectable, () => fetchMock as never);

    installExtensionApiGlobals();

    fixture = await importFixtureBundle();
    // The bundle is a singleton for the whole file, so its module state is
    // reset rather than recreated.
    fixture.setStatusBarItemVisible(true);
    runInAction(() => fixture.activationRecord.set(undefined));
  });

  it("evaluates only once the host has published its API on the global", () => {
    // The bundle reads `globalThis.FreelensExtensionApi` while it evaluates, so
    // it is the global — not an import — that the extension depends on.
    expect(Reflect.get(globalThis, "FreelensExtensionApi")).toMatchObject({
      Common: expect.any(Object),
      Renderer: expect.any(Object),
      React: expect.any(Object),
      Mobx: expect.any(Object),
    });
  });

  it("shares the host's singletons by identity, not by shape", () => {
    // For mobx this is the assertion that matters. Two copies of mobx 6 keep
    // interoperating through the shared global state they both write to
    // `globalThis`, so a reaction fires either way and the behavioural checks
    // below stay green while the extension carries a duplicate.
    expect(fixture.resolvedMobxObservable).toBe(observable);
    expect(fixture.resolvedReactUseState).toBe(React.useState);
  });

  describe("when the extension is registered with the host", () => {
    let extension: LensRendererExtension;
    let statusBarItems: StatusBarItems;
    let disposeObserver: (() => void) | undefined;

    beforeEach(() => {
      extension = new fixture.default(installedFixture);

      const hostExtension = di.inject(extensionInjectable, extension);

      hostExtension.register();

      const computedStatusBarItems = di.inject(statusBarItemsInjectable);

      // Observed, not merely read: an unobserved mobx computed recomputes on
      // every `.get()`, which would make the reactivity assertion below pass
      // without anything having been tracked.
      disposeObserver = autorun(() => {
        statusBarItems = computedStatusBarItems.get();
      });
    });

    afterEach(() => {
      disposeObserver?.();
    });

    it("shows the extension's declarative registration in the host", () => {
      expect(statusBarItems.right.map((item) => item.origin)).toContain(EXTENSION_NAME);
    });

    it("reacts to an observable the extension created, through the host's own mobx", () => {
      fixture.setStatusBarItemVisible(false);

      expect(statusBarItems.right.map((item) => item.origin)).not.toContain(EXTENSION_NAME);

      fixture.setStatusBarItemVisible(true);

      expect(statusBarItems.right.map((item) => item.origin)).toContain(EXTENSION_NAME);
    });

    it("renders the extension's component, hooks included, on the host's React", () => {
      const registered = statusBarItems.right.find((item) => item.origin === EXTENSION_NAME);

      expect(registered).toBeDefined();

      // Two React instances make every hook in this component throw
      // "invalid hook call" right here.
      const result = render(React.createElement(registered?.component ?? (() => null)));
      const item = result.getByTestId("fixture-status-bar-item");

      expect(item).toHaveTextContent("fixture:0");

      fireEvent.click(item);

      expect(item).toHaveTextContent("fixture:1");
    });

    describe("when the extension is activated", () => {
      let recorded: (unknown | undefined)[];

      beforeEach(async () => {
        recorded = [];

        // The host reacting to an observable the extension owns. This is the
        // statement of the contract, not a detector of its breach: as above, it
        // keeps firing even when the extension carries its own mobx, so only
        // the identity assertion catches that.
        const dispose = autorun(() => recorded.push(fixture.activationRecord.get()));

        await extension.activate();
        dispose();
      });

      it("reaches the host's HTTP client through Renderer.Util.fetch", () => {
        expect(fetchMock).toHaveBeenCalledWith(fixture.FIXTURE_PROBE_URL);
      });

      it("reaches the host's DI container through Common.Util", () => {
        expect(fixture.activationRecord.get()).toEqual({ appVersion: "1.2.3", probeStatus: 204 });
      });

      it("notifies the host of the change it made to its own observable", () => {
        expect(recorded).toEqual([undefined, { appVersion: "1.2.3", probeStatus: 204 }]);
      });
    });
  });
});
