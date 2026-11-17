/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import downloadBinaryViaChannelInjectable from "../../fetch/download-binary-via-channel.injectable";
import downloadJsonViaChannelInjectable from "../../fetch/download-json-via-channel-copy.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import attemptInstallInjectable from "./attempt-install/attempt-install.injectable";
import attemptInstallByInfoInjectable from "./attempt-install-by-info.injectable";
import getBaseRegistryUrlInjectable from "./get-base-registry-url/get-base-registry-url.injectable";

import type { Mock } from "vitest";

import type { AttemptInstallByInfo } from "./attempt-install-by-info.injectable";

const name = "@freelensapp/some-extension";
const tarball = "https://registry.npmjs.org/@freelensapp/some-extension/-/some-extension-1.2.3.tgz";
const tarballThroughRegistry =
  "https://example.com/artifactory/api/npm/all-npm/@freelensapp/some-extension/-/some-extension-1.2.3.tgz";
const integrity = "sha512-Yz9tRlmXyUlZqHvD0n5qmBhzQqUeQC3xIQ1EM3tTPqcPPbMmlJlMHPnzwFexpQVLRjPEDQxDcGKxFy+JHDlRSQ==";

describe("attemptInstallByInfo, the download of the archive", () => {
  let baseRegistryUrl: string;
  let attemptInstallByInfo: AttemptInstallByInfo;
  let attemptInstallMock: Mock;
  let downloadBinaryMock: Mock;
  let showErrorNotificationMock: Mock;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    attemptInstallMock = vi.fn();
    downloadBinaryMock = vi.fn(async () => ({ callWasSuccessful: true, response: Buffer.from("archive") }));
    showErrorNotificationMock = vi.fn();

    di.override(attemptInstallInjectable, () => attemptInstallMock);
    di.override(getBaseRegistryUrlInjectable, () => async () => baseRegistryUrl);
    di.override(downloadJsonViaChannelInjectable, () => async () => ({
      callWasSuccessful: true,
      response: { "dist-tags": { latest: "1.2.3" }, versions: { "1.2.3": { dist: { tarball, integrity } } } },
    }));
    di.override(downloadBinaryViaChannelInjectable, () => downloadBinaryMock);
    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);

    attemptInstallByInfo = di.inject(attemptInstallByInfoInjectable);
  });

  it("downloads the archive from the default registry where its metadata says", async () => {
    baseRegistryUrl = "https://registry.npmjs.org";

    await attemptInstallByInfo({ name });

    expect(downloadBinaryMock).toHaveBeenCalledWith(tarball, expect.anything());
  });

  it("downloads the archive from a configured registry that lists the tarball of the default one", async () => {
    baseRegistryUrl = "https://example.com/artifactory/api/npm/all-npm/";

    await attemptInstallByInfo({ name });

    expect(downloadBinaryMock).toHaveBeenCalledTimes(1);
    expect(downloadBinaryMock).toHaveBeenCalledWith(tarballThroughRegistry, expect.anything());
  });

  it("installs the archive of a configured registry as the same file, with the checksum of its metadata", async () => {
    baseRegistryUrl = "https://example.com/artifactory/api/npm/all-npm/";

    await attemptInstallByInfo({ name });

    expect(attemptInstallMock).toHaveBeenCalledWith(
      {
        fileName: "some-extension-1.2.3.tgz",
        data: Buffer.from("archive"),
        source: { kind: "registry", name, version: "1.2.3" },
        checksum: { kind: "integrity", value: integrity },
      },
      expect.anything(),
    );
  });

  it("names the URL it asked the configured registry for when the download fails", async () => {
    baseRegistryUrl = "https://example.com/artifactory/api/npm/all-npm/";
    downloadBinaryMock.mockResolvedValue({ callWasSuccessful: false, error: "Not Found" });

    await attemptInstallByInfo({ name });

    expect(showErrorNotificationMock).toHaveBeenCalledWith(
      `Failed to download extension from ${tarballThroughRegistry}: Not Found`,
    );
    expect(attemptInstallMock).not.toHaveBeenCalled();
  });
});
