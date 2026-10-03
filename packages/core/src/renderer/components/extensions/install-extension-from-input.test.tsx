/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import statInjectable from "../../../common/fs/stat.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import installFromDirectoryInjectable from "./attempt-install/install-from-directory.injectable";
import installFromFileInjectable from "./attempt-install/install-from-file.injectable";
import installFromUrlInjectable from "./attempt-install/install-from-url.injectable";
import attemptInstallByInfoInjectable from "./attempt-install-by-info.injectable";
import installExtensionFromInputInjectable from "./install-extension-from-input.injectable";
import type { Stats } from "node:fs";

import type { Mock } from "vitest";

import type { InstallExtensionFromInput } from "./install-extension-from-input.injectable";

describe("installExtensionFromInput", () => {
  let installExtensionFromInput: InstallExtensionFromInput;
  let installFromUrlMock: Mock;
  let installFromFileMock: Mock;
  let installFromDirectoryMock: Mock;
  let attemptInstallByInfoMock: Mock;
  let statMock: Mock;

  const statsOf = (isDirectory: boolean) => ({ isDirectory: () => isDirectory }) as Stats;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    installFromUrlMock = vi.fn(async () => {});
    installFromFileMock = vi.fn(async () => {});
    installFromDirectoryMock = vi.fn(async () => {});
    attemptInstallByInfoMock = vi.fn(async () => {});
    statMock = vi.fn(async () => {
      throw new Error("ENOENT");
    });

    di.override(installFromUrlInjectable, () => installFromUrlMock);
    di.override(installFromFileInjectable, () => installFromFileMock);
    di.override(installFromDirectoryInjectable, () => installFromDirectoryMock);
    di.override(attemptInstallByInfoInjectable, () => attemptInstallByInfoMock);
    di.override(statInjectable, () => statMock);
    di.override(showErrorNotificationInjectable, () => vi.fn());

    installExtensionFromInput = di.inject(installExtensionFromInputInjectable);
  });

  it.each(["https://example.com/my-extension-0.1.0.tgz", "http://example.com/my-extension-0.1.0.tgz"])(
    "downloads %s",
    async (input) => {
      await installExtensionFromInput(input);

      expect(installFromUrlMock).toHaveBeenCalledWith(input);
      expect(statMock).not.toHaveBeenCalled();
    },
  );

  // `new URL` parses a drive path as a URL with protocol `d:`, which is why the
  // generic `isUrl` validator cannot decide this.
  it("installs a Windows drive path to a directory in place rather than downloading it", async () => {
    const input = "D:\\a\\freelens\\packages\\fixture-extension";

    statMock.mockResolvedValue(statsOf(true));

    await installExtensionFromInput(input);

    expect(installFromUrlMock).not.toHaveBeenCalled();
    expect(installFromDirectoryMock).toHaveBeenCalledWith(input);
  });

  it("installs a Windows drive path to a tarball from the file rather than downloading it", async () => {
    const input = "C:\\Users\\me\\Downloads\\my-extension-0.1.0.tgz";

    statMock.mockResolvedValue(statsOf(false));

    await installExtensionFromInput(input);

    expect(installFromUrlMock).not.toHaveBeenCalled();
    expect(installFromFileMock).toHaveBeenCalledWith(input);
  });

  it("installs a POSIX path to a directory in place", async () => {
    statMock.mockResolvedValue(statsOf(true));

    await installExtensionFromInput("/home/me/my-extension");

    expect(installFromDirectoryMock).toHaveBeenCalledWith("/home/me/my-extension");
  });

  it("resolves a package name against the registry", async () => {
    await installExtensionFromInput("@freelensapp/some-extension@1.2.3");

    expect(installFromUrlMock).not.toHaveBeenCalled();
    expect(attemptInstallByInfoMock).toHaveBeenCalledWith({ name: "@freelensapp/some-extension", version: "1.2.3" });
  });
});
