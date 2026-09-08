/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import directoryForUserDataInjectable from "../../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../../../../common/fs/fs.injectable";
import { getDiForUnitTesting } from "../../../../../../renderer/getDiForUnitTesting";
import discoverSiblingLensInstallsInjectable from "./discover-sibling-lens-installs.injectable";

import type { DiscoverSiblingLensInstalls } from "./discover-sibling-lens-installs.injectable";

describe("discoverSiblingLensInstalls", () => {
  const installsParentDir = "/fake/app-data";
  const ownUserDataDir = path.join(installsParentDir, "IMS-Scope");

  let discoverSiblingLensInstalls: DiscoverSiblingLensInstalls;
  let writeJson: (file: string, data: unknown) => Promise<void>;

  const writeStoreFile = async (dir: string, data: unknown) => {
    await di.inject(fsInjectable).ensureDir(dir);
    await writeJson(path.join(dir, "lens-user-store.json"), data);
  };

  let di: ReturnType<typeof getDiForUnitTesting>;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => ownUserDataDir);

    discoverSiblingLensInstalls = di.inject(discoverSiblingLensInstallsInjectable);
    writeJson = di.inject(fsInjectable).writeJson;
  });

  it("given no sibling app data directories exist, returns no installs", async () => {
    expect(await discoverSiblingLensInstalls()).toEqual([]);
  });

  it("given a sibling app has synced kubeconfig entries, returns its file paths", async () => {
    await writeStoreFile(path.join(installsParentDir, "OpenLens"), {
      preferences: {
        syncKubeconfigEntries: [{ filePath: "/home/user/.kube" }, { filePath: "/home/user/configs/a.yaml" }],
      },
    });

    expect(await discoverSiblingLensInstalls()).toEqual([
      { appName: "OpenLens", filePaths: ["/home/user/.kube", "/home/user/configs/a.yaml"] },
    ]);
  });

  it("given multiple sibling apps have entries, returns one result per app", async () => {
    await writeStoreFile(path.join(installsParentDir, "OpenLens"), {
      preferences: { syncKubeconfigEntries: [{ filePath: "/home/user/.kube" }] },
    });
    await writeStoreFile(path.join(installsParentDir, "Freelens"), {
      preferences: { syncKubeconfigEntries: [{ filePath: "/home/user/other.yaml" }] },
    });

    expect(await discoverSiblingLensInstalls()).toEqual([
      { appName: "OpenLens", filePaths: ["/home/user/.kube"] },
      { appName: "Freelens", filePaths: ["/home/user/other.yaml"] },
    ]);
  });

  it("given a sibling app has no synced kubeconfig entries, does not include it", async () => {
    await writeStoreFile(path.join(installsParentDir, "OpenLens"), {
      preferences: { syncKubeconfigEntries: [] },
    });

    expect(await discoverSiblingLensInstalls()).toEqual([]);
  });

  it("given a sibling app's store file is corrupt, skips it without throwing", async () => {
    const fs = { pathExists: async () => true, readJson: async () => Promise.reject(new Error("bad json")) };
    const di = getDiForUnitTesting();

    di.override(directoryForUserDataInjectable, () => ownUserDataDir);
    di.override(fsInjectable, () => fs as any);

    const discover = di.inject(discoverSiblingLensInstallsInjectable);

    await expect(discover()).resolves.toEqual([]);
  });

  it("does not treat its own userData directory as a sibling install", async () => {
    const ownDi = getDiForUnitTesting();
    const ownFreelensDir = path.join(installsParentDir, "Freelens");

    ownDi.override(directoryForUserDataInjectable, () => ownFreelensDir);

    const ownFs = ownDi.inject(fsInjectable);

    await ownFs.ensureDir(ownFreelensDir);
    await ownFs.writeJson(path.join(ownFreelensDir, "lens-user-store.json"), {
      preferences: { syncKubeconfigEntries: [{ filePath: "/home/user/.kube" }] },
    });

    const discover = ownDi.inject(discoverSiblingLensInstallsInjectable);

    expect(await discover()).toEqual([]);
  });
});
