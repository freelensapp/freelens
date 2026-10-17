/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import statInjectable from "../../common/fs/stat.injectable";
import writeJsonSyncInjectable from "../../common/fs/write-json-sync.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import forkPnpmInjectable from "./fork-pnpm.injectable";
import installExtensionInjectable from "./install-extension.injectable";

import type { InstallExtension } from "./install-extension.injectable";

describe("install-extension", () => {
  let installExtension: InstallExtension;
  let forkPnpmMock: jest.Mock;
  let pathExistsMock: jest.Mock;
  let statMock: jest.Mock;
  let writeJsonSyncMock: jest.Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    pathExistsMock = jest.fn().mockResolvedValue(false);
    di.override(pathExistsInjectable, () => pathExistsMock);

    statMock = jest.fn();
    di.override(statInjectable, () => statMock);

    writeJsonSyncMock = jest.fn();
    di.override(writeJsonSyncInjectable, () => writeJsonSyncMock);

    forkPnpmMock = jest.fn().mockResolvedValue(undefined);
    di.override(forkPnpmInjectable, () => forkPnpmMock);

    installExtension = di.inject(installExtensionInjectable);
  });

  it("bootstraps a missing package.json and installs all extensions in one call", async () => {
    await installExtension({
      paths: ["/tmp/my-extension", "/tmp/other-extension"],
      packageJsonPath: "/some-directory-for-user-data/package.json",
    });

    expect(pathExistsMock).toHaveBeenCalledWith("/some-directory-for-user-data/package.json");
    expect(statMock).not.toHaveBeenCalled();
    expect(writeJsonSyncMock).toHaveBeenCalledWith("/some-directory-for-user-data/package.json", {
      private: true,
    });
    expect(forkPnpmMock).toHaveBeenCalledTimes(1);
    expect(forkPnpmMock).toHaveBeenCalledWith(
      "install",
      "--prefer-offline",
      "--prod",
      "--force",
      "--save-optional",
      "/tmp/my-extension",
      "/tmp/other-extension",
    );
  });

  it("bootstraps an empty package.json before installing extensions", async () => {
    pathExistsMock.mockResolvedValue(true);
    statMock.mockResolvedValue({ size: 0 });

    await installExtension({
      paths: ["/tmp/my-extension", "/tmp/other-extension"],
      packageJsonPath: "/some-directory-for-user-data/package.json",
    });

    expect(statMock).toHaveBeenCalledWith("/some-directory-for-user-data/package.json");
    expect(writeJsonSyncMock).toHaveBeenCalledWith("/some-directory-for-user-data/package.json", { private: true });
    expect(forkPnpmMock).toHaveBeenCalledTimes(1);
    expect(forkPnpmMock).toHaveBeenCalledWith(
      "install",
      "--prefer-offline",
      "--prod",
      "--force",
      "--save-optional",
      "/tmp/my-extension",
      "/tmp/other-extension",
    );
  });

  it("preserves a nonempty package.json", async () => {
    pathExistsMock.mockResolvedValue(true);
    statMock.mockResolvedValue({ size: 20 });

    await installExtension({
      paths: ["/tmp/my-extension"],
      packageJsonPath: "/some-directory-for-user-data/package.json",
    });

    expect(writeJsonSyncMock).not.toHaveBeenCalled();
    expect(forkPnpmMock).toHaveBeenCalledTimes(1);
  });
});
