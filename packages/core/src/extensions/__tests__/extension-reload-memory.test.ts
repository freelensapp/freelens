/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { setImmediate } from "node:timers/promises";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { autorun } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import statusBarItemsInjectable from "../../renderer/components/status-bar/status-bar-items.injectable";
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import currentlyInClusterFrameInjectable from "../../renderer/routes/currently-in-cluster-frame.injectable";
import extensionInstancesInjectable from "../extension-loader/extension-instances.injectable";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";
import { LensRendererExtension } from "../lens-renderer-extension";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ExtensionLoader } from "../extension-loader";
import type { InstalledExtension, LensExtensionConstructor } from "../installed-extension";

// Reloading a development extension replaces its instance. The memory of the
// instance it replaced has to become collectable while the renderer goes on
// running, or every rebuild an author makes costs the renderer one more copy
// of the extension's state for as long as the window lives.
//
// Each build of the extension owns STATE_BYTES of ArrayBuffer, which
// `process.memoryUsage().arrayBuffers` counts exactly, so the measurement is
// not lost in the noise of the JavaScript heap: with the old instances
// collected it stays flat across the reloads, and with them retained it grows
// by STATE_BYTES per reload.

setFlagsFromString("--expose-gc");
const gc = runInNewContext("gc") as () => void;

const MiB = 1024 * 1024;
const STATE_BYTES = 8 * MiB;
const WARM_UP_RELOADS = 2;
const MEASURED_RELOADS = 10;

const developmentExtension: InstalledExtension = {
  id: "/home/someone/src/my-extension/package.json",
  absolutePath: "/home/someone/src/my-extension",
  manifestPath: "/home/someone/src/my-extension/package.json",
  manifest: {
    name: "my-extension",
    version: "0.1.0",
    engines: { freelens: "^2.0.0" },
    renderer: "out/renderer.js",
  },
  isCompatible: true,
  isManaged: false,
  isVerified: false,
  isEnabled: true,
};

// A rebuild is a new module, so every load evaluates a new class.
const buildOfExtension = (build: number) =>
  class MyExtension extends LensRendererExtension {
    readonly build = build;
    readonly state = new ArrayBuffer(STATE_BYTES);

    statusBarItems = [{ id: "build", components: { Item: () => null } }];
  };

// Full collections, with turns of the event loop between them, so that
// finalization and the freeing of ArrayBuffer backing stores have happened
// before anything is measured.
const collectGarbage = async () => {
  for (let pass = 0; pass < 6; pass++) {
    await setImmediate();
    gc();
  }
};

interface Sample {
  reload: number;
  arrayBuffersMiB: number;
  heapUsedMiB: number;
}

const toMiB = (bytes: number) => Math.round((bytes / MiB) * 10) / 10;

const sample = async (reload: number): Promise<Sample> => {
  await collectGarbage();

  const { arrayBuffers, heapUsed } = process.memoryUsage();

  return { reload, arrayBuffersMiB: toMiB(arrayBuffers), heapUsedMiB: toMiB(heapUsed) };
};

const describeSamples = (samples: Sample[]) =>
  [
    "reload  arrayBuffers MiB  heapUsed MiB",
    ...samples.map(
      ({ reload, arrayBuffersMiB, heapUsedMiB }) =>
        `${String(reload).padStart(6)}  ${String(arrayBuffersMiB).padStart(16)}  ${String(heapUsedMiB).padStart(12)}`,
    ),
  ].join("\n");

describe("reloading a development extension in the renderer, memory", () => {
  let di: DiContainer;
  let extensionLoader: ExtensionLoader;
  let builds: number;
  let statusBarItemCount: number;
  let stopStatusBar: () => void;

  beforeEach(() => {
    builds = 0;
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(currentlyInClusterFrameInjectable, () => false);

    extensionLoader = di.inject(extensionLoaderInjectable);

    // Importing the entry point is the only part of the path that would touch
    // the filesystem; everything after it -- instantiation, the extension's
    // view of the container, registration and teardown -- is the real one.
    vi.spyOn(
      extensionLoader as unknown as { requireExtension: () => Promise<LensExtensionConstructor | null> },
      "requireExtension",
    ).mockImplementation(async () => buildOfExtension(++builds) as unknown as LensExtensionConstructor);

    extensionLoader.addExtension(developmentExtension);

    // What the status bar does: it observes the items, which injects the
    // extension's contributions. A contribution's own injectable holds the
    // extension it came from, so this is part of what has to be let go.
    const statusBarItems = di.inject(statusBarItemsInjectable);

    stopStatusBar = autorun(() => {
      const { left, right } = statusBarItems.get();

      statusBarItemCount = left.length + right.length;
    });
  });

  afterEach(() => {
    stopStatusBar();
  });

  const reload = async () => {
    await extensionLoader.reloadDevelopmentExtension(developmentExtension.id, `token-${builds + 1}`);
  };

  it("loads a new build on every reload", async () => {
    const extensionInstances = di.inject(extensionInstancesInjectable);

    await reload();
    await reload();

    expect((extensionInstances.get(developmentExtension.id) as unknown as { build: number }).build).toBe(2);
    expect(extensionInstances.size).toBe(1);
    expect(statusBarItemCount).toBe(1);
  });

  it("does not grow by the state of the builds it replaced", async () => {
    for (let i = 0; i < WARM_UP_RELOADS; i++) {
      await reload();
    }

    const samples = [await sample(0)];

    for (let i = 1; i <= MEASURED_RELOADS; i++) {
      await reload();
      samples.push(await sample(i));
    }

    const growthMiB = samples[samples.length - 1].arrayBuffersMiB - samples[0].arrayBuffersMiB;
    const report = `${describeSamples(samples)}\n\ngrowth over ${MEASURED_RELOADS} reloads: ${growthMiB} MiB (${STATE_BYTES / MiB} MiB of state per build)`;

    console.log(report);

    // One build's worth of slack: only the current build has to stay alive,
    // and it is alive at both ends of the measurement.
    expect(growthMiB, report).toBeLessThan(STATE_BYTES / MiB);
  });
});
