/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import removePathInjectable from "../../../../common/fs/remove.injectable";
import { getDiForUnitTesting } from "../../../../main/getDiForUnitTesting";
import activateInstalledBuildInjectable from "./activate-installed-build.injectable";
import installedExtensionsStateInjectable from "./installed-extensions-state.injectable";

import type { Mock } from "vitest";

import type { ActivateInstalledBuild } from "./activate-installed-build.injectable";
import type { InstalledExtensionEntry } from "./installed-extensions";

const extensionsRoot = "/some-directory-for-user-data/extensions";

describe("activateInstalledBuild", () => {
  let activateInstalledBuild: ActivateInstalledBuild;
  let installedExtensions: Map<string, InstalledExtensionEntry>;
  let removePathMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    removePathMock = vi.fn(() => Promise.resolve());
    di.override(removePathInjectable, () => removePathMock);

    installedExtensions = di.inject(installedExtensionsStateInjectable);
    activateInstalledBuild = di.inject(activateInstalledBuildInjectable);
  });

  const build = (version: string, digest: string): InstalledExtensionEntry => ({
    name: "my-extension",
    path: `${extensionsRoot}/my-extension/${version}-${digest}`,
    version,
    digest,
    source: { kind: "registry", name: "my-extension", version },
    verified: true,
  });

  it("records the new build as live", async () => {
    await activateInstalledBuild(build("1.0.0", "0f1e2d3c"));

    expect(installedExtensions.get("my-extension")).toEqual(build("1.0.0", "0f1e2d3c"));
  });

  it("deletes the build it superseded, but only after the new one is recorded", async () => {
    await activateInstalledBuild(build("1.0.0", "0f1e2d3c"));

    removePathMock.mockImplementation(async (path: string) => {
      expect(path).toBe(`${extensionsRoot}/my-extension/1.0.0-0f1e2d3c`);
      expect(installedExtensions.get("my-extension")?.version).toBe("2.0.0");
    });

    await activateInstalledBuild(build("2.0.0", "abcdef01"));

    expect(removePathMock).toHaveBeenCalledTimes(1);
  });

  it("does not delete anything when the same build is installed again", async () => {
    await activateInstalledBuild(build("1.0.0", "0f1e2d3c"));
    await activateInstalledBuild(build("1.0.0", "0f1e2d3c"));

    expect(removePathMock).not.toHaveBeenCalled();
  });

  it("leaves a superseded external directory alone, which is someone's working copy", async () => {
    runInAction(() => {
      installedExtensions.set("my-extension", {
        name: "my-extension",
        path: "/home/someone/src/my-extension",
        source: { kind: "directory", path: "/home/someone/src/my-extension" },
        verified: false,
      });
    });

    await activateInstalledBuild(build("1.0.0", "0f1e2d3c"));

    expect(installedExtensions.get("my-extension")?.path).toBe(`${extensionsRoot}/my-extension/1.0.0-0f1e2d3c`);
    expect(removePathMock).not.toHaveBeenCalled();
  });

  it("keeps the new build live when the superseded one cannot be deleted yet", async () => {
    await activateInstalledBuild(build("1.0.0", "0f1e2d3c"));

    removePathMock.mockRejectedValue(Object.assign(new Error("EBUSY"), { code: "EBUSY" }));

    await activateInstalledBuild(build("2.0.0", "abcdef01"));

    expect(installedExtensions.get("my-extension")?.version).toBe("2.0.0");
  });
});
