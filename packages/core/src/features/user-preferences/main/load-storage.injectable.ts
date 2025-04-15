/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeApplicationIsLoadingInjectionToken } from "@freelensapp/application";
import { getInjectable } from "@ogre-tools/injectable";
import { buildVersionInitializationInjectable } from "../../vars/build-version/main/init.injectable";
import userPreferencesPersistentStorageInjectable from "../common/storage.injectable";
import userPreferencesStorageFileNameMigrationInjectable from "./file-name-migration.injectable";

const loadUserPreferencesStorageInjectable = getInjectable({
  id: "load-user-preferences-storage",
  instantiate: (di) => ({
    run: async () => {
      const storage = di.inject(userPreferencesPersistentStorageInjectable);
      const userStoreFileNameMigration = di.inject(userPreferencesStorageFileNameMigrationInjectable);

      await userStoreFileNameMigration();
      storage.loadAndStartSyncing();
    },
    runAfter: buildVersionInitializationInjectable,
  }),
  injectionToken: beforeApplicationIsLoadingInjectionToken,
});

export default loadUserPreferencesStorageInjectable;
