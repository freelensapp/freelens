/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import path from "node:path";
import { getInjectable } from "@ogre-tools/injectable";
import directoryForUserDataInjectable from "../../../../../../common/app-paths/directory-for-user-data/directory-for-user-data.injectable";
import fsInjectable from "../../../../../../common/fs/fs.injectable";

export interface SiblingLensInstall {
  appName: string;
  filePaths: string[];
}

export type DiscoverSiblingLensInstalls = () => Promise<SiblingLensInstall[]>;

// Every fork of the original Lens app persists its kubeconfig sync list under
// this file name in its own userData directory, keyed by these product names.
const siblingAppNames = ["Lens", "OpenLens", "Freelens"];
const kubeconfigSyncStoreFileName = "lens-user-store.json";

const discoverSiblingLensInstallsInjectable = getInjectable({
  id: "discover-sibling-lens-installs",
  instantiate: (di): DiscoverSiblingLensInstalls => {
    const fs = di.inject(fsInjectable);
    const userDataDir = di.inject(directoryForUserDataInjectable);
    const ownDirName = path.basename(userDataDir);
    const installsParentDir = path.dirname(userDataDir);

    return async () => {
      const results: SiblingLensInstall[] = [];

      for (const appName of siblingAppNames) {
        if (appName === ownDirName) {
          continue;
        }

        const storeFilePath = path.join(installsParentDir, appName, kubeconfigSyncStoreFileName);

        if (!(await fs.pathExists(storeFilePath))) {
          continue;
        }

        try {
          const data = await fs.readJson(storeFilePath);
          const entries = data?.preferences?.syncKubeconfigEntries;

          if (!Array.isArray(entries)) {
            continue;
          }

          const filePaths = entries
            .map((entry) => entry?.filePath)
            .filter((filePath): filePath is string => typeof filePath === "string" && filePath.length > 0);

          if (filePaths.length > 0) {
            results.push({ appName, filePaths });
          }
        } catch {
          // Corrupt or unreadable store file belonging to the sibling app; skip it.
        }
      }

      return results;
    };
  },
});

export default discoverSiblingLensInstallsInjectable;
