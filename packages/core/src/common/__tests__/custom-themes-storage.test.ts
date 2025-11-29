/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import userPreferencesPersistentStorageInjectable from "../../features/user-preferences/common/storage.injectable";
import releaseChannelInjectable from "../../features/vars/common/release-channel.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import directoryForUserDataInjectable from "../app-paths/directory-for-user-data/directory-for-user-data.injectable";
import writeFileInjectable from "../fs/write-file.injectable";
import writeJsonSyncInjectable from "../fs/write-json-sync.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { UserPreferencesState } from "../../features/user-preferences/common/state.injectable";
import type { LensTheme } from "../../renderer/themes/lens-theme";

describe("custom themes storage", () => {
  let state: UserPreferencesState;
  let di: DiContainer;

  beforeEach(async () => {
    di = getDiForUnitTesting();

    di.override(writeFileInjectable, () => () => Promise.resolve());
    di.override(directoryForUserDataInjectable, () => "/some-directory-for-user-data");
    di.override(releaseChannelInjectable, () => "latest");

    state = di.inject(userPreferencesStateInjectable);
  });

  describe("saving custom themes", () => {
    beforeEach(() => {
      const writeJsonSync = di.inject(writeJsonSyncInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {});
      writeJsonSync("/some-directory-for-user-data/kube_config", {});

      di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();
    });

    it("allows saving a custom theme", () => {
      const customTheme: Partial<LensTheme> = {
        name: "My Custom Theme",
        type: "dark",
        description: "A custom dark theme",
        author: "Test User",
        monacoTheme: "clouds-midnight",
        isCustom: true,
        createdAt: new Date().toISOString(),
        colors: {
          primary: "#ff0000",
        } as any,
        terminalColors: {},
      };

      state.customThemes = [customTheme as LensTheme];

      expect(state.customThemes).toHaveLength(1);
      expect(state.customThemes[0].name).toBe("My Custom Theme");
      expect(state.customThemes[0].colors.primary).toBe("#ff0000");
    });

    it("persists custom themes across reloads", () => {
      const customTheme: Partial<LensTheme> = {
        name: "Persistent Theme",
        type: "light",
        description: "Should persist",
        author: "Test",
        monacoTheme: "vs",
        isCustom: true,
        colors: { primary: "#00ff00" } as any,
        terminalColors: {},
      };

      state.customThemes = [customTheme as LensTheme];

      const storage = di.inject(userPreferencesPersistentStorageInjectable);
      const json = JSON.parse(JSON.stringify(storage.toJSON()));

      expect(json.preferences.customThemes).toBeDefined();
      expect(json.preferences.customThemes).toHaveLength(1);
      expect(json.preferences.customThemes[0].name).toBe("Persistent Theme");
    });

    it("handles multiple custom themes", () => {
      const theme1: Partial<LensTheme> = {
        name: "Theme 1",
        type: "dark",
        colors: {} as any,
        terminalColors: {},
        description: "",
        author: "",
        monacoTheme: "clouds-midnight",
      };
      const theme2: Partial<LensTheme> = {
        name: "Theme 2",
        type: "light",
        colors: {} as any,
        terminalColors: {},
        description: "",
        author: "",
        monacoTheme: "vs",
      };

      state.customThemes = [theme1 as LensTheme, theme2 as LensTheme];

      expect(state.customThemes).toHaveLength(2);
    });
  });
});
