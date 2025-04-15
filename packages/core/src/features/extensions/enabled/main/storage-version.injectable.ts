/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import storageMigrationVersionInjectable from "../../../persistent-storage/main/storage-migration-version.injectable";
import { enabledExtensionsPersistentStorageVersionInitializable } from "../common/storage-version";
import { enabledExtensionsMigrationDeclarationInjectionToken } from "./migrations";

const enabledExtensionsPersistentStorageVersionStateInjectable = getInjectable({
  id: "enabled-extensions-persistent-storage-version-state",
  instantiate: (di) =>
    di.inject(storageMigrationVersionInjectable, enabledExtensionsMigrationDeclarationInjectionToken),
  injectionToken: enabledExtensionsPersistentStorageVersionInitializable.stateToken,
});

export default enabledExtensionsPersistentStorageVersionStateInjectable;
