/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { createHash } from "node:crypto";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import directoryForUserDataInjectable from "../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import attemptInstallInjectable from "./attempt-install.injectable";
import createTempFilesAndValidateInjectable from "./create-temp-files-and-validate.injectable";
import unpackExtensionInjectable from "./unpack-extension.injectable";

import type { Mock } from "vitest";

import type { AttemptInstall } from "./attempt-install.injectable";

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
