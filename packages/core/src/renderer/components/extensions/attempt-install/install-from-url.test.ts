/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import { beforeEach, describe, expect, it, vi } from "vitest";
import downloadBinaryViaChannelInjectable from "../../../fetch/download-binary-via-channel.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import attemptInstallInjectable from "./attempt-install.injectable";
import installFromUrlInjectable from "./install-from-url.injectable";

import type { Mock } from "vitest";

import type { InstallFromUrl } from "./install-from-url.injectable";

const url = "https://example.com/releases/my-extension-1.0.0.tgz";
const digest = "a".repeat(64);
const tarball = [0x1f, 0x8b, 0x08, 0x00];

/**
 * What a response looks like after the IPC: a plain `Uint8Array`, which the
 * structured clone leaves of the `Buffer` main sent.
 */
const overIpc = (bytes: Uint8Array) => {
  const array = new Uint8Array(bytes);

  expect(Buffer.isBuffer(array)).toBe(false);

  return array;
};

describe("installFromUrl", () => {
  let installFromUrl: InstallFromUrl;
  let downloadBinaryMock: Mock;
  let attemptInstallMock: Mock;
  let showErrorNotificationMock: Mock;

  const respond = (sidecar: string | undefined) => {
    downloadBinaryMock.mockImplementation(async (target: string) => {
      if (target === url) {
        return { callWasSuccessful: true, response: overIpc(Uint8Array.from(tarball)) };
      }

      if (target === `${url}.sha256` && sidecar !== undefined) {
        return { callWasSuccessful: true, response: overIpc(new TextEncoder().encode(sidecar)) };
      }

      return { callWasSuccessful: false, error: "Not Found" };
    });
  };

  beforeEach(() => {
    const di = getDiForUnitTesting();

    downloadBinaryMock = vi.fn();
    attemptInstallMock = vi.fn(async () => {});
    showErrorNotificationMock = vi.fn();

    di.override(downloadBinaryViaChannelInjectable, () => downloadBinaryMock);
    di.override(attemptInstallInjectable, () => attemptInstallMock);
    di.override(showErrorNotificationInjectable, () => showErrorNotificationMock);

    installFromUrl = di.inject(installFromUrlInjectable);
  });

  it("reads a sha256sum line from the sidecar it received over IPC", async () => {
    respond(`${digest}  my-extension-1.0.0.tgz\n`);

    await installFromUrl(url);

    expect(attemptInstallMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "my-extension-1.0.0.tgz",
        source: { kind: "url", url },
        checksum: { kind: "sha256", value: digest },
      }),
      expect.any(Function),
    );
  });

  it("reads a bare digest from the sidecar it received over IPC", async () => {
    respond(digest);

    await installFromUrl(url);

    expect(attemptInstallMock).toHaveBeenCalledWith(
      expect.objectContaining({ checksum: { kind: "sha256", value: digest } }),
      expect.any(Function),
    );
  });

  it("passes the tarball it received over IPC on with its bytes", async () => {
    respond(digest);

    await installFromUrl(url);

    const [{ data }] = attemptInstallMock.mock.calls[0];

    expect([...data]).toEqual(tarball);
  });

  it("installs unverified when there is no sidecar", async () => {
    respond(undefined);

    await installFromUrl(url);

    expect(attemptInstallMock).toHaveBeenCalledWith(
      expect.objectContaining({ checksum: undefined }),
      expect.any(Function),
    );
  });

  it("installs unverified when the sidecar names another file only", async () => {
    respond(`${digest}  some-other-file.tgz\n`);

    await installFromUrl(url);

    expect(attemptInstallMock).toHaveBeenCalledWith(
      expect.objectContaining({ checksum: undefined }),
      expect.any(Function),
    );
  });

  it("reports a failed download of the tarball and installs nothing", async () => {
    downloadBinaryMock.mockResolvedValue({ callWasSuccessful: false, error: "Not Found" });

    await installFromUrl(url);

    expect(showErrorNotificationMock).toHaveBeenCalledWith("Failed to download extension: Not Found");
    expect(attemptInstallMock).not.toHaveBeenCalled();
  });
});
