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
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import unpackExtensionInjectable from "./unpack-extension.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ExtensionLoader } from "../../../../extensions/extension-loader";
import type { UnpackExtension } from "./unpack-extension.injectable";

const extensionId = "/some-extension-id";

describe("unpackExtension", () => {
  let di: DiContainer;
  let unpackExtension: UnpackExtension;
  let workDir: string;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    workDir = await fse.mkdtemp(path.join(os.tmpdir(), "freelens-unpack-extension-"));

    di.override(extensionsRootInjectable, () => path.join(workDir, "extensions"));
    di.override(extractTarInjectable, () => async (_filePath, opts) => {
      await fse.outputJson(path.join(opts?.cwd ?? workDir, "package", "package.json"), { name: "my-extension" });
    });
    di.override(activateInstalledBuildInjectable, () => vi.fn(async () => {}));
    di.override(
      extensionLoaderInjectable,
      () =>
        ({
          userExtensions: computed(() => new Map([[extensionId, {}]])),
          setIsEnabled: vi.fn(),
        }) as unknown as ExtensionLoader,
    );

    unpackExtension = di.inject(unpackExtensionInjectable);
  });

  afterEach(async () => {
    await fse.remove(workDir);
  });

  it("reports a successful install with a success notification which hides on its own", async () => {
    const tempFile = path.join(workDir, "my-extension-0.1.0.tgz");

    await fse.writeFile(tempFile, "not really a tarball");

    await unpackExtension({
      id: extensionId,
      fileName: "my-extension-0.1.0.tgz",
      data: Buffer.from("not really a tarball"),
      tempFile,
      manifest: { name: "my-extension", version: "0.1.0", engines: { freelens: "^2.0.0" } },
      checksum: { kind: "sha256", value: "0".repeat(64) },
    });

    const notificationsStore = di.inject(notificationsStoreInjectable);

    expect(notificationsStore.notifications).toHaveLength(1);
    expect(notificationsStore.notifications[0]).toMatchObject({
      status: NotificationStatus.OK,
      timeout: expect.any(Number),
    });
    expect(notificationsStore.notifications[0].timeout).toBeGreaterThan(0);
  });
});
