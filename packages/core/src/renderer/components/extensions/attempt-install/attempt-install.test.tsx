/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import { textOf } from "../../../../test-utils/text-of";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import confirmInjectable from "../../confirm-dialog/confirm.injectable";
import attemptInstallInjectable from "./attempt-install.injectable";
import createTempFilesAndValidateInjectable from "./create-temp-files-and-validate.injectable";
import unpackExtensionInjectable from "./unpack-extension.injectable";

import type { Mock } from "vitest";

import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { InstalledExtension } from "../../../../extensions/installed-extension";
import type { AttemptInstall } from "./attempt-install.injectable";
import type { InstallRequestValidated } from "./create-temp-files-and-validate.injectable";

const tarball = Buffer.from("not really a tarball, but it hashes like one");
const digestOf = (data: Buffer) => createHash("sha256").update(data).digest("hex");

describe("attemptInstall", () => {
  let attemptInstall: AttemptInstall;
  let createTempFilesAndValidateMock: Mock;
  let unpackExtensionMock: Mock;
  let showErrorNotificationMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    createTempFilesAndValidateMock = vi.fn(async () => null);
    unpackExtensionMock = vi.fn(async () => {});
    showErrorNotificationMock = vi.fn();

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(createTempFilesAndValidateInjectable, () => createTempFilesAndValidateMock);
    di.override(unpackExtensionInjectable, () => unpackExtensionMock);
    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);

    attemptInstall = di.inject(attemptInstallInjectable);
  });

  it("refuses a tarball which does not match its checksum, before anything reads inside it", async () => {
    await attemptInstall({
      fileName: "my-extension-0.1.0.tgz",
      data: tarball,
      checksum: { kind: "sha256", value: digestOf(Buffer.from("a different tarball")) },
    });

    // Nothing wrote the temp file, nothing parsed the archive, and nothing put
    // a manifest read out of it in front of the user.
    expect(createTempFilesAndValidateMock).not.toHaveBeenCalled();
    expect(unpackExtensionMock).not.toHaveBeenCalled();
    expect(showErrorNotificationMock).toHaveBeenCalled();
  });

  it("refuses a tarball whose checksum cannot be evaluated", async () => {
    await attemptInstall({
      fileName: "my-extension-0.1.0.tgz",
      data: tarball,
      checksum: { kind: "integrity", value: "md5-nope" },
    });

    expect(createTempFilesAndValidateMock).not.toHaveBeenCalled();
    expect(showErrorNotificationMock).toHaveBeenCalled();
  });

  it("goes on to validate a tarball which matches its checksum", async () => {
    await attemptInstall({
      fileName: "my-extension-0.1.0.tgz",
      data: tarball,
      checksum: { kind: "sha256", value: digestOf(tarball) },
    });

    expect(createTempFilesAndValidateMock).toHaveBeenCalled();
    expect(showErrorNotificationMock).not.toHaveBeenCalled();
  });

  it("goes on to validate a tarball which has no checksum at all, since that warns rather than refuses", async () => {
    await attemptInstall({ fileName: "my-extension-0.1.0.tgz", data: tarball });

    expect(createTempFilesAndValidateMock).toHaveBeenCalled();
    expect(showErrorNotificationMock).not.toHaveBeenCalled();
  });
});

describe("attemptInstall of an extension which is already installed", () => {
  const extensionId = "@freelensapp/example-extension";

  let attemptInstall: AttemptInstall;
  let installed: InstalledExtension | undefined;
  let confirmMock: Mock;
  let unpackExtensionMock: Mock;
  let showErrorNotificationMock: Mock;
  let setIsEnabledMock: Mock;
  let cleanup: Mock;
  // What happened, in order, across the loader and the unpacking.
  let events: string[];
  let finishTearingDown: () => void;
  let failTearingDown: (error: Error) => void;

  const validatedRequest: InstallRequestValidated = {
    id: extensionId,
    fileName: "example-extension-2.0.0-2.tgz",
    data: tarball,
    tempFile: "/some-temp-dir/example-extension-2.0.0-2.tgz",
    manifest: { name: extensionId, version: "2.0.0-2", engines: { freelens: "^2.0.0" } },
    checksum: { kind: "sha256", value: digestOf(tarball) },
  };

  const installedExtension = (isEnabled: boolean, version = "2.0.0-1"): InstalledExtension => ({
    id: extensionId,
    absolutePath: `/some-directory-for-user-data/extensions/freelensapp--example-extension/${version}-0f1e2d3c`,
    manifestPath: `/some-directory-for-user-data/extensions/freelensapp--example-extension/${version}-0f1e2d3c/package.json`,
    manifest: { name: extensionId, version, engines: { freelens: "^2.0.0" } },
    isCompatible: true,
    isManaged: true,
    isVerified: true,
    isEnabled,
  });

  const install = () =>
    attemptInstall(
      { fileName: validatedRequest.fileName, data: tarball, checksum: validatedRequest.checksum },
      cleanup,
    );

  beforeEach(() => {
    const di = getDiForUnitTesting();

    events = [];
    installed = undefined;
    cleanup = vi.fn();
    confirmMock = vi.fn(async () => true);
    showErrorNotificationMock = vi.fn();
    unpackExtensionMock = vi.fn(async () => {
      // `unpackExtension` is what removes the build directory.
      events.push("unpack");
    });
    setIsEnabledMock = vi.fn(async (id: string, isEnabled: boolean) => {
      events.push(`set-is-enabled ${isEnabled}`);
    });

    const whenTornDown = vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          events.push("waiting for the teardown");
          finishTearingDown = () => {
            events.push("torn down");
            resolve();
          };
          failTearingDown = reject;
        }),
    );

    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(createTempFilesAndValidateInjectable, () => async () => validatedRequest);
    di.override(unpackExtensionInjectable, () => unpackExtensionMock);
    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);
    di.override(confirmInjectable, () => confirmMock);
    di.override(
      extensionLoaderInjectable,
      () =>
        ({
          getExtensionById: () => installed,
          setIsEnabled: setIsEnabledMock,
          whenTornDown,
        }) as unknown as ExtensionLoader,
    );

    attemptInstall = di.inject(attemptInstallInjectable);
  });

  it("installs an extension which is not installed yet without asking", async () => {
    await install();

    expect(confirmMock).not.toHaveBeenCalled();
    expect(events).toEqual(["unpack"]);
  });

  describe("when it is enabled", () => {
    beforeEach(() => {
      installed = installedExtension(true);
    });

    it("asks to replace it with the other version rather than refusing", async () => {
      confirmMock.mockResolvedValue(false);

      await install();

      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ labelOk: "Replace", labelCancel: "Cancel" }));

      const [[{ message }]] = confirmMock.mock.calls;

      expect(textOf(message)).toContain(`Replace ${extensionId}@2.0.0-1 with ${extensionId}@2.0.0-2?`);
      expect(textOf(message)).toContain(
        `${extensionId}@2.0.0-1 is enabled and will be disabled and replaced by ${extensionId}@2.0.0-2.`,
      );
      expect(showErrorNotificationMock).not.toHaveBeenCalled();
    });

    it("asks to reinstall it when the version is the same", async () => {
      installed = installedExtension(true, "2.0.0-2");
      confirmMock.mockResolvedValue(false);

      await install();

      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({ labelOk: "Reinstall", labelCancel: "Cancel" }),
      );

      const [[{ message }]] = confirmMock.mock.calls;

      expect(textOf(message)).toContain(`Reinstall ${extensionId}?`);
      expect(textOf(message)).toContain(`${extensionId}@2.0.0-2 is enabled and will be disabled and installed again.`);
      expect(showErrorNotificationMock).not.toHaveBeenCalled();
    });

    it("asks to replace a directory registered in development even when the version is the same", async () => {
      installed = {
        ...installedExtension(true, "2.0.0-2"),
        absolutePath: "/some-directory",
        manifestPath: "/some-directory/package.json",
        isManaged: false,
        isVerified: false,
      };
      confirmMock.mockResolvedValue(false);

      await install();

      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ labelOk: "Replace", labelCancel: "Cancel" }));

      const [[{ message }]] = confirmMock.mock.calls;

      expect(textOf(message)).toContain(
        `Replace ${extensionId}@2.0.0-2 from /some-directory with ${extensionId}@2.0.0-2?`,
      );
      expect(textOf(message)).toContain(
        `${extensionId}@2.0.0-2 is enabled and will be disabled and replaced by ${extensionId}@2.0.0-2.`,
      );
    });

    it("leaves it alone when the replacement is cancelled", async () => {
      confirmMock.mockResolvedValue(false);

      await install();

      expect(setIsEnabledMock).not.toHaveBeenCalled();
      expect(events).toEqual([]);
      // The pre-install state is over.
      expect(cleanup).toHaveBeenCalled();
    });

    it("disables it and does not start unpacking, which removes the build directory, before the teardown has finished", async () => {
      const installing = install();

      await vi.waitFor(() => expect(events).toContain("waiting for the teardown"));
      // Plenty of time for anything not waiting on the teardown to have run.
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(events).toEqual(["set-is-enabled false", "waiting for the teardown"]);

      finishTearingDown();
      await installing;

      expect(events).toEqual(["set-is-enabled false", "waiting for the teardown", "torn down", "unpack"]);
      expect(unpackExtensionMock).toHaveBeenCalledWith(validatedRequest, expect.any(Function), {
        disabledVersion: "2.0.0-1",
        isReinstall: false,
      });
    });

    it("does not unpack, and says it stays disabled, when the teardown does not finish", async () => {
      const installing = install();

      await vi.waitFor(() => expect(events).toContain("waiting for the teardown"));

      failTearingDown(new Error("the main process did not finish tearing it down within 10 seconds"));
      await installing;

      expect(unpackExtensionMock).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalled();
      expect(showErrorNotificationMock).toHaveBeenCalledTimes(1);

      const [[notification]] = showErrorNotificationMock.mock.calls;

      expect(textOf(notification)).toContain(`Replacing ${extensionId}@2.0.0-1 with ${extensionId}@2.0.0-2 has failed`);
      expect(textOf(notification)).toContain("stays disabled");
    });

    it("says that reinstalling has failed when the version is the same", async () => {
      installed = installedExtension(true, "2.0.0-2");

      const installing = install();

      await vi.waitFor(() => expect(events).toContain("waiting for the teardown"));

      failTearingDown(new Error("the main process did not finish tearing it down within 10 seconds"));
      await installing;

      const [[notification]] = showErrorNotificationMock.mock.calls;

      expect(textOf(notification)).toContain(`Reinstalling ${extensionId} has failed`);
      expect(textOf(notification)).toContain("stays disabled");
    });
  });

  describe("when it is disabled", () => {
    beforeEach(() => {
      installed = installedExtension(false);
    });

    it("asks to replace it in the dialog rather than in a notification", async () => {
      confirmMock.mockResolvedValue(false);

      await install();

      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ labelOk: "Install", labelCancel: "Cancel" }));
      expect(events).toEqual([]);
      expect(cleanup).toHaveBeenCalled();
    });

    it("does not disable it again, and still waits out a teardown which may be running before unpacking", async () => {
      const installing = install();

      await vi.waitFor(() => expect(events).toContain("waiting for the teardown"));

      finishTearingDown();
      await installing;

      expect(setIsEnabledMock).not.toHaveBeenCalled();
      expect(events).toEqual(["waiting for the teardown", "torn down", "unpack"]);
      expect(unpackExtensionMock).toHaveBeenCalledWith(validatedRequest, expect.any(Function), undefined);
    });
  });
});
