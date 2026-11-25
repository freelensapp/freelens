/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import os from "node:os";
import path from "node:path";
import { NotificationStatus, notificationsStoreInjectable } from "@freelensapp/notifications";
import fse from "fs-extra";
import { computed } from "mobx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import extractTarInjectable from "../../../../common/fs/extract-tar.injectable";
import extensionLoaderInjectable from "../../../../extensions/extension-loader/extension-loader.injectable";
import activateInstalledBuildInjectable from "../../../../features/extensions/installer/common/activate-installed-build.injectable";
import extensionsRootInjectable from "../../../../features/extensions/installer/common/extensions-root.injectable";
import { textOf } from "../../../../test-utils/text-of";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import unpackExtensionInjectable from "./unpack-extension.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { Mock } from "vitest";

import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { InstallRequestValidated } from "./create-temp-files-and-validate.injectable";
import type { UnpackExtension } from "./unpack-extension.injectable";

const extensionId = "/some-extension-id";

describe("unpackExtension", () => {
  let di: DiContainer;
  let unpackExtension: UnpackExtension;
  let workDir: string;
  let setIsEnabledMock: Mock;
  let activateInstalledBuildMock: Mock;
  // Whether the build comes up enabled once discovery has it, which the
  // enabled state left behind for its name decides.
  let comesUpEnabled: boolean;

  const request = async (checksum?: InstallRequestValidated["checksum"]): Promise<InstallRequestValidated> => {
    const tempFile = path.join(workDir, "my-extension-0.1.0.tgz");

    await fse.writeFile(tempFile, "not really a tarball");

    return {
      id: extensionId,
      fileName: "my-extension-0.1.0.tgz",
      data: Buffer.from("not really a tarball"),
      tempFile,
      manifest: { name: "my-extension", version: "0.1.0", engines: { freelens: "^2.0.0" } },
      checksum,
    };
  };

  const notifications = () => di.inject(notificationsStoreInjectable).notifications;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    workDir = await fse.mkdtemp(path.join(os.tmpdir(), "freelens-unpack-extension-"));

    di.override(extensionsRootInjectable, () => path.join(workDir, "extensions"));
    di.override(extractTarInjectable, () => async (_filePath, opts) => {
      await fse.outputJson(path.join(opts?.cwd ?? workDir, "package", "package.json"), { name: "my-extension" });
    });
    activateInstalledBuildMock = vi.fn(async () => {});
    di.override(activateInstalledBuildInjectable, () => activateInstalledBuildMock);
    comesUpEnabled = false;
    setIsEnabledMock = vi.fn(async () => {});
    di.override(
      extensionLoaderInjectable,
      () =>
        ({
          userExtensions: computed(() => new Map([[extensionId, { isEnabled: comesUpEnabled }]])),
          setIsEnabled: setIsEnabledMock,
        }) as unknown as ExtensionLoader,
    );

    unpackExtension = di.inject(unpackExtensionInjectable);
  });

  afterEach(async () => {
    await fse.remove(workDir);
  });

  it("enables a verified install and reports it with a success notification which hides on its own", async () => {
    await unpackExtension(await request({ kind: "sha256", value: "0".repeat(64) }));

    expect(activateInstalledBuildMock).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
    expect(setIsEnabledMock).toHaveBeenCalledWith(extensionId, true);
    expect(notifications()).toHaveLength(1);
    expect(notifications()[0]).toMatchObject({
      status: NotificationStatus.OK,
      timeout: expect.any(Number),
    });
    expect(notifications()[0].timeout).toBeGreaterThan(0);
  });

  describe("without a checksum", () => {
    it("records the build as unverified and leaves it disabled", async () => {
      await unpackExtension(await request());

      expect(activateInstalledBuildMock).toHaveBeenCalledWith(expect.objectContaining({ verified: false }));
      expect(setIsEnabledMock).not.toHaveBeenCalled();
    });

    it("says that it is installed disabled and why, in a notification which stays until it is dismissed", async () => {
      await unpackExtension(await request());

      expect(notifications()).toHaveLength(1);
      expect(notifications()[0]).toMatchObject({ status: NotificationStatus.INFO });
      expect(notifications()[0].timeout).toBeFalsy();

      const text = textOf(notifications()[0].message);

      expect(text).toContain("Extension my-extension@0.1.0 is installed, but disabled");
      expect(text).toContain("nothing vouches for its integrity");
      expect(text).toContain("Enable it on the Extensions page");
      expect(text).not.toContain("successfully installed");
    });

    it("says why it stays disabled when it replaced an enabled build", async () => {
      await unpackExtension(await request(), undefined, { disabledVersion: "0.0.9", isReinstall: false });

      expect(setIsEnabledMock).not.toHaveBeenCalled();
      expect(textOf(notifications()[0].message)).toContain(
        "my-extension@0.0.9 was enabled and was disabled to be replaced. my-extension stays disabled, because the build installed now is unverified.",
      );
    });

    it("says why it stays disabled when it was installed again over an enabled build", async () => {
      await unpackExtension(await request(), undefined, { disabledVersion: "0.1.0", isReinstall: true });

      expect(textOf(notifications()[0].message)).toContain(
        "my-extension@0.1.0 was enabled and was disabled to be installed again.",
      );
    });

    it("disables it when it comes up enabled from a state left over for its name", async () => {
      comesUpEnabled = true;

      await unpackExtension(await request());

      expect(setIsEnabledMock).toHaveBeenCalledTimes(1);
      expect(setIsEnabledMock).toHaveBeenCalledWith(extensionId, false);
    });
  });
});
