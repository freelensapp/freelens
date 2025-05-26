/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { DiContainer } from "@ogre-tools/injectable";
import type { ClusterStoreModel } from "../../features/cluster/storage/common/storage.injectable";
import type { ResetTheme } from "../../features/user-preferences/common/reset-theme.injectable";
import resetThemeInjectable from "../../features/user-preferences/common/reset-theme.injectable";
import type { UserPreferencesState } from "../../features/user-preferences/common/state.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import userPreferencesPersistentStorageInjectable from "../../features/user-preferences/common/storage.injectable";
import releaseChannelInjectable from "../../features/vars/common/release-channel.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import directoryForUserDataInjectable from "../app-paths/directory-for-user-data/directory-for-user-data.injectable";
import writeFileSyncInjectable from "../fs/write-file-sync.injectable";
import writeFileInjectable from "../fs/write-file.injectable";
import writeJsonSyncInjectable from "../fs/write-json-sync.injectable";
import { defaultThemeId } from "../vars";
import storeMigrationVersionInjectable from "../vars/store-migration-version.injectable";

describe("user store tests", () => {
  let state: UserPreferencesState;
  let resetTheme: ResetTheme;
  let di: DiContainer;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    di.override(writeFileInjectable, () => () => Promise.resolve());
    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");

    di.override(releaseChannelInjectable, () => "latest");

    state = di.inject(userPreferencesStateInjectable);
    resetTheme = di.inject(resetThemeInjectable);
  });

  describe("for an empty config", () => {
    beforeEach(() => {
      const writeJsonSync = di.inject(writeJsonSyncInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {});
      writeJsonSync("/some-directory-for-user-data/kube_config", {});

      di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();
    });

    it("allows setting and getting preferences", () => {
      state.httpsProxy = "abcd://defg";

      expect(state.httpsProxy).toBe("abcd://defg");
      expect(state.colorTheme).toBe(defaultThemeId);

      state.colorTheme = "light";
      expect(state.colorTheme).toBe("light");
    });

    it("correctly resets theme to default value", async () => {
      state.colorTheme = "some other theme";
      resetTheme();
      expect(state.colorTheme).toBe(defaultThemeId);
    });
  });
});
