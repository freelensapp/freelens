/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import ensureDirInjectable from "../../../common/fs/ensure-dir.injectable";
import { getDiForUnitTesting } from "../../../main/getDiForUnitTesting";
import directoryForExtensionDataInjectable from "./directory-for-extension-data.injectable";
import ensureHashedDirectoryForExtensionInjectable from "./ensure-hashed-directory-for-extension.injectable";
import { registeredExtensionsInjectable } from "./registered-extensions.injectable";

import type { ObservableMap } from "mobx";
import type { Mock } from "vitest";

import type { EnsureHashedDirectoryForExtension } from "./ensure-hashed-directory-for-extension.injectable";

describe("ensure-hashed-directory-for-extension", () => {
  let ensureHashedDirectoryForExtension: EnsureHashedDirectoryForExtension;
  let ensureDirMock: Mock;
  let registeredExtensions: ObservableMap<string, string>;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    ensureDirMock = vi.fn();

    di.override(ensureDirInjectable, () => ensureDirMock);
    di.override(directoryForExtensionDataInjectable, () => "some-directory-for-extension-data");

    ensureHashedDirectoryForExtension = di.inject(ensureHashedDirectoryForExtensionInjectable);

    registeredExtensions = di.inject(registeredExtensionsInjectable);
  });

  it("given registered extension exists, returns existing directory", async () => {
    runInAction(() => {
      registeredExtensions.set("some-extension-name", "some-directory");
    });

    const actual = await ensureHashedDirectoryForExtension("some-extension-name");

    expect(actual).toBe("some-directory");
  });

  it("given registered extension does not exist, returns random directory", async () => {
    const actual = await ensureHashedDirectoryForExtension("some-extension-name");

    expect(actual).toBe(
      "some-directory-for-extension-data/a37a1cfefc0391af3733f23cb6b29443f596a2b8ffe6d116c35df7bc3cd99ef6",
    );
  });
});
