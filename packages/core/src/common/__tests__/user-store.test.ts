/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it } from "vitest";
import resetThemeInjectable from "../../features/user-preferences/common/reset-theme.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import userPreferencesPersistentStorageInjectable from "../../features/user-preferences/common/storage.injectable";
import releaseChannelInjectable from "../../features/vars/common/release-channel.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import directoryForUserDataInjectable from "../app-paths/directory-for-user-data/directory-for-user-data.injectable";
import readJsonSyncInjectable from "../fs/read-json-sync.injectable";
import writeFileInjectable from "../fs/write-file.injectable";
import writeJsonSyncInjectable from "../fs/write-json-sync.injectable";
import { defaultColorThemePreference } from "../vars";

import type { DiContainer } from "@ogre-tools/injectable";

import type { ResetTheme } from "../../features/user-preferences/common/reset-theme.injectable";
import type { UserPreferencesState } from "../../features/user-preferences/common/state.injectable";

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
      expect(state.colorTheme).toBe(defaultColorThemePreference);
      expect(state.groupCustomResourcesByDomain).toBe(false);
      expect(state.customResourceGroupRootDepth).toBe(1);

      state.colorTheme = "light";
      expect(state.colorTheme).toBe("light");
    });

    it("correctly resets theme to default value", async () => {
      state.colorTheme = "some other theme";
      resetTheme();
      expect(state.colorTheme).toBe(defaultColorThemePreference);
    });

    it("loads and stores persistentSearch as a global preference", async () => {
      const writeJsonSync = di.inject(writeJsonSyncInjectable);
      const readJsonSync = di.inject(readJsonSyncInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {
        preferences: {
          persistentSearch: true,
        },
      });
      writeJsonSync("/some-directory-for-user-data/kube_config", {});

      di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();

      expect(state.persistentSearch).toBe(true);

      state.persistentSearch = false;
      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {},
      });
      expect(
        readJsonSync("/some-directory-for-user-data/lens-user-store.json").preferences.persistentSearch,
      ).toBeUndefined();

      state.persistentSearch = true;
      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {
          persistentSearch: true,
        },
      });
    });

    it("loads and stores groupCustomResourcesByDomain as a global preference", async () => {
      const writeJsonSync = di.inject(writeJsonSyncInjectable);
      const readJsonSync = di.inject(readJsonSyncInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {
        preferences: {
          groupCustomResourcesByDomain: true,
        },
      });
      writeJsonSync("/some-directory-for-user-data/kube_config", {});

      di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();

      expect(state.groupCustomResourcesByDomain).toBe(true);

      state.groupCustomResourcesByDomain = false;
      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {},
      });

      state.groupCustomResourcesByDomain = true;
      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {
          groupCustomResourcesByDomain: true,
        },
      });
    });

    it("loads and stores customResourceGroupRootDepth as a global preference", async () => {
      const writeJsonSync = di.inject(writeJsonSyncInjectable);
      const readJsonSync = di.inject(readJsonSyncInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {
        preferences: {
          customResourceGroupRootDepth: 2,
        },
      });
      writeJsonSync("/some-directory-for-user-data/kube_config", {});

      di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();

      expect(state.customResourceGroupRootDepth).toBe(2);

      state.customResourceGroupRootDepth = 1;
      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {},
      });

      state.customResourceGroupRootDepth = 37;
      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {
          customResourceGroupRootDepth: 37,
        },
      });
    });

    it("loads and stores logViewerPreferences as a global preference", async () => {
      const writeJsonSync = di.inject(writeJsonSyncInjectable);
      const readJsonSync = di.inject(readJsonSyncInjectable);

      writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {
        preferences: {
          logViewerPreferences: {
            showTimestamps: true,
            showWordWrap: false,
          },
        },
      });
      writeJsonSync("/some-directory-for-user-data/kube_config", {});

      di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();

      expect(state.logViewerPreferences).toEqual({
        showTimestamps: true,
        showWordWrap: false,
        maxCombinedLogsPods: 20,
      });

      state.logViewerPreferences = {
        showTimestamps: true,
        showWordWrap: false,
        maxCombinedLogsPods: 20,
      };

      expect(readJsonSync("/some-directory-for-user-data/lens-user-store.json")).toMatchObject({
        preferences: {
          logViewerPreferences: {
            showTimestamps: true,
            showWordWrap: false,
          },
        },
      });

      state.logViewerPreferences = {
        showTimestamps: false,
        showWordWrap: true,
        maxCombinedLogsPods: 20,
      };

      expect(
        readJsonSync("/some-directory-for-user-data/lens-user-store.json").preferences.logViewerPreferences,
      ).toBeUndefined();
    });

    describe("maxCombinedLogsPods of logViewerPreferences", () => {
      const loadStoredLogViewerPreferences = (logViewerPreferences: unknown) => {
        const writeJsonSync = di.inject(writeJsonSyncInjectable);

        writeJsonSync("/some-directory-for-user-data/lens-user-store.json", {
          preferences: { logViewerPreferences },
        });
        writeJsonSync("/some-directory-for-user-data/kube_config", {});

        di.inject(userPreferencesPersistentStorageInjectable).loadAndStartSyncing();
      };

      const readStoredLogViewerPreferences = () =>
        di.inject(readJsonSyncInjectable)("/some-directory-for-user-data/lens-user-store.json").preferences
          .logViewerPreferences;

      it("defaults to 20 without a stored value", () => {
        loadStoredLogViewerPreferences(undefined);

        expect(state.logViewerPreferences.maxCombinedLogsPods).toBe(20);
      });

      it("defaults to 20 for an older store without the field", () => {
        loadStoredLogViewerPreferences({ showTimestamps: true });

        expect(state.logViewerPreferences).toEqual({
          showTimestamps: true,
          showWordWrap: true,
          maxCombinedLogsPods: 20,
        });
      });

      it("reads a stored value inside the range", () => {
        loadStoredLogViewerPreferences({ maxCombinedLogsPods: 50 });

        expect(state.logViewerPreferences.maxCombinedLogsPods).toBe(50);
      });

      it.each([
        [500, 100],
        [101, 100],
        [0, 1],
        [-3, 1],
        [12.4, 12],
        ["50", 20],
        [null, 20],
      ])("reads a stored value of %j as %j", (stored, expected) => {
        loadStoredLogViewerPreferences({ maxCombinedLogsPods: stored });

        expect(state.logViewerPreferences.maxCombinedLogsPods).toBe(expected);
      });

      it("stores a value inside the range", () => {
        loadStoredLogViewerPreferences(undefined);

        state.logViewerPreferences = { ...state.logViewerPreferences, maxCombinedLogsPods: 40 };

        expect(readStoredLogViewerPreferences()).toEqual({ maxCombinedLogsPods: 40 });
      });

      it.each([
        [1000, 100],
        [0, 1],
      ])("stores a value of %j as %j", (value, expected) => {
        loadStoredLogViewerPreferences(undefined);

        state.logViewerPreferences = { ...state.logViewerPreferences, maxCombinedLogsPods: value };

        expect(readStoredLogViewerPreferences()).toEqual({ maxCombinedLogsPods: expected });
      });

      it("does not store the default", () => {
        loadStoredLogViewerPreferences({ maxCombinedLogsPods: 40 });

        state.logViewerPreferences = { ...state.logViewerPreferences, maxCombinedLogsPods: 20 };

        expect(readStoredLogViewerPreferences()).toBeUndefined();
      });
    });
  });
});
