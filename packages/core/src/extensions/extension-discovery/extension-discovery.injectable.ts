/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { loggerInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import ensureDirInjectable from "../../common/fs/ensure-dir.injectable";
import pathExistsInjectable from "../../common/fs/path-exists.injectable";
import readDirectoryInjectable from "../../common/fs/read-directory.injectable";
import readJsonFileInjectable from "../../common/fs/read-json-file.injectable";
import removePathInjectable from "../../common/fs/remove.injectable";
import watchInjectable from "../../common/fs/watch/watch.injectable";
import getBasenameOfPathInjectable from "../../common/path/get-basename.injectable";
import joinPathsInjectable from "../../common/path/join-paths.injectable";
import isExtensionEnabledInjectable from "../../features/extensions/enabled/common/is-enabled.injectable";
import extensionsRootInjectable from "../../features/extensions/installer/common/extensions-root.injectable";
import forgetInstalledExtensionInjectable from "../../features/extensions/installer/common/forget-installed-extension.injectable";
import installedExtensionsStateInjectable from "../../features/extensions/installer/common/installed-extensions-state.injectable";
import recordInstalledExtensionInjectable from "../../features/extensions/installer/common/record-installed-extension.injectable";
import sweepOrphanedExtensionBuildsInjectable from "../../features/extensions/installer/common/sweep-orphaned-builds.injectable";
import extensionLoaderInjectable from "../extension-loader/extension-loader.injectable";
import { ExtensionDiscovery } from "./extension-discovery";
import isCompatibleExtensionInjectable from "./is-compatible-extension/is-compatible-extension.injectable";

const extensionDiscoveryInjectable = getInjectable({
  id: "extension-discovery",

  instantiate: (di) =>
    new ExtensionDiscovery({
      extensionLoader: di.inject(extensionLoaderInjectable),
      extensionsRoot: di.inject(extensionsRootInjectable),
      installedExtensions: di.inject(installedExtensionsStateInjectable),
      isExtensionEnabled: di.inject(isExtensionEnabledInjectable),
      isCompatibleExtension: di.inject(isCompatibleExtensionInjectable),
      recordInstalledExtension: di.inject(recordInstalledExtensionInjectable),
      forgetInstalledExtension: di.inject(forgetInstalledExtensionInjectable),
      sweepOrphanedExtensionBuilds: di.inject(sweepOrphanedExtensionBuildsInjectable),
      readJsonFile: di.inject(readJsonFileInjectable),
      pathExists: di.inject(pathExistsInjectable),
      watch: di.inject(watchInjectable),
      logger: di.inject(loggerInjectionToken),
      removePath: di.inject(removePathInjectable),
      ensureDirectory: di.inject(ensureDirInjectable),
      readDirectory: di.inject(readDirectoryInjectable),
      getBasenameOfPath: di.inject(getBasenameOfPathInjectable),
      joinPaths: di.inject(joinPathsInjectable),
    }),
});

export default extensionDiscoveryInjectable;
