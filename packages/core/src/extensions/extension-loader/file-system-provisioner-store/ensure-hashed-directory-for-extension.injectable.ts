/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getOrInsert } from "@freelensapp/utilities";
import { getInjectable } from "@ogre-tools/injectable";
import ensureDirInjectable from "../../../common/fs/ensure-dir.injectable";
import joinPathsInjectable from "../../../common/path/join-paths.injectable";
import randomBytesInjectable from "../../../common/utils/random-bytes.injectable";
import directoryForExtensionDataInjectable from "./directory-for-extension-data.injectable";
import getHashInjectable from "./get-hash.injectable";
import { registeredExtensionsInjectable } from "./registered-extensions.injectable";

export type EnsureHashedDirectoryForExtension = (extensionName: string) => Promise<string>;

const ensureHashedDirectoryForExtensionInjectable = getInjectable({
  id: "ensure-hashed-directory-for-extension",

  instantiate: (di): EnsureHashedDirectoryForExtension => {
    const randomBytes = di.inject(randomBytesInjectable);
    const joinPaths = di.inject(joinPathsInjectable);
    const directoryForExtensionData = di.inject(directoryForExtensionDataInjectable);
    const ensureDirectory = di.inject(ensureDirInjectable);
    const getHash = di.inject(getHashInjectable);
    const registeredExtensions = di.inject(registeredExtensionsInjectable);

    return async (extensionName) => {
      const salt = randomBytes(32).toString("hex");
      const hashedName = getHash(`${extensionName}/${salt}`);

      const hashedExtensionDirectory = joinPaths(directoryForExtensionData, hashedName);

      const dirPath = getOrInsert(registeredExtensions, extensionName, hashedExtensionDirectory);

      await ensureDirectory(dirPath);

      return dirPath;
    };
  },
});

export default ensureHashedDirectoryForExtensionInjectable;
