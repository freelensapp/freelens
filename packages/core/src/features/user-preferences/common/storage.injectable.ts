/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { prefixedLoggerInjectable } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { action } from "mobx";
import { toJS } from "../../../common/utils";
import storeMigrationVersionInjectable from "../../../common/vars/store-migration-version.injectable";
import createPersistentStorageInjectable from "../../persistent-storage/common/create.injectable";
import persistentStorageMigrationsInjectable from "../../persistent-storage/common/migrations.injectable";
import { userPreferencesMigrationInjectionToken } from "./migrations-token";
import userPreferenceDescriptorsInjectable from "./preference-descriptors.injectable";
import userPreferencesStateInjectable from "./state.injectable";

import type { UserPreferencesModel } from "./preferences-helpers";

export interface UserStoreModel {
  preferences: UserPreferencesModel;
}

const userPreferencesPersistentStorageInjectable = getInjectable({
  id: "user-preferences-persistent-storage",
  instantiate: (di) => {
    const createPersistentStorage = di.inject(createPersistentStorageInjectable);
    const logger = di.inject(prefixedLoggerInjectable, "USER-PREFERENCES");
    const descriptors = di.inject(userPreferenceDescriptorsInjectable);
    const state = di.inject(userPreferencesStateInjectable);

    return createPersistentStorage<UserStoreModel>({
      configName: "lens-user-store",
      projectVersion: di.inject(storeMigrationVersionInjectable),
      migrations: di.inject(persistentStorageMigrationsInjectable, userPreferencesMigrationInjectionToken),
      fromStore: action(({ preferences = {} }) => {
        logger.debug("fromStore()", { preferences });

        state.allowErrorReporting = descriptors.allowErrorReporting.fromStore(preferences.allowErrorReporting);
        state.allowUntrustedCAs = descriptors.allowUntrustedCAs.fromStore(preferences.allowUntrustedCAs);
        state.colorTheme = descriptors.colorTheme.fromStore(preferences.colorTheme);
        state.downloadBinariesPath = descriptors.downloadBinariesPath.fromStore(preferences.downloadBinariesPath);
        state.downloadKubectlBinaries = descriptors.downloadKubectlBinaries.fromStore(
          preferences.downloadKubectlBinaries,
        );
        state.downloadMirror = descriptors.downloadMirror.fromStore(preferences.downloadMirror);
        state.editorConfiguration = descriptors.editorConfiguration.fromStore(preferences.editorConfiguration);
        state.extensionRegistryUrl = descriptors.extensionRegistryUrl.fromStore(preferences.extensionRegistryUrl);
        state.hiddenTableColumns = descriptors.hiddenTableColumns.fromStore(preferences.hiddenTableColumns);
        state.httpsProxy = descriptors.httpsProxy.fromStore(preferences.httpsProxy);
        state.kubectlBinariesPath = descriptors.kubectlBinariesPath.fromStore(preferences.kubectlBinariesPath);
        state.localeTimezone = descriptors.localeTimezone.fromStore(preferences.localeTimezone);
        state.openAtLogin = descriptors.openAtLogin.fromStore(preferences.openAtLogin);
        state.showTrayIcon = descriptors.showTrayIcon.fromStore(preferences.showTrayIcon);
        state.hotbarAutoHide = descriptors.hotbarAutoHide.fromStore(preferences.hotbarAutoHide);
        state.shell = descriptors.shell.fromStore(preferences.shell);
        state.syncKubeconfigEntries = descriptors.syncKubeconfigEntries.fromStore(preferences.syncKubeconfigEntries);
        state.terminalConfig = descriptors.terminalConfig.fromStore(preferences.terminalConfig);
        state.terminalCopyOnSelect = descriptors.terminalCopyOnSelect.fromStore(preferences.terminalCopyOnSelect);
        state.terminalTheme = descriptors.terminalTheme.fromStore(preferences.terminalTheme);
        state.clusterPageMenuOrder = descriptors.clusterPageMenuOrder.fromStore(preferences.clusterPageMenuOrder);
      }),
      toJSON: () =>
        toJS({
          preferences: {
            allowErrorReporting: descriptors.allowErrorReporting.toStore(state.allowErrorReporting),
            allowUntrustedCAs: descriptors.allowUntrustedCAs.toStore(state.allowUntrustedCAs),
            colorTheme: descriptors.colorTheme.toStore(state.colorTheme),
            downloadBinariesPath: descriptors.downloadBinariesPath.toStore(state.downloadBinariesPath),
            downloadKubectlBinaries: descriptors.downloadKubectlBinaries.toStore(state.downloadKubectlBinaries),
            downloadMirror: descriptors.downloadMirror.toStore(state.downloadMirror),
            editorConfiguration: descriptors.editorConfiguration.toStore(state.editorConfiguration),
            extensionRegistryUrl: descriptors.extensionRegistryUrl.toStore(state.extensionRegistryUrl),
            hiddenTableColumns: descriptors.hiddenTableColumns.toStore(state.hiddenTableColumns),
            httpsProxy: descriptors.httpsProxy.toStore(state.httpsProxy),
            kubectlBinariesPath: descriptors.kubectlBinariesPath.toStore(state.kubectlBinariesPath),
            localeTimezone: descriptors.localeTimezone.toStore(state.localeTimezone),
            openAtLogin: descriptors.openAtLogin.toStore(state.openAtLogin),
            showTrayIcon: descriptors.showTrayIcon.toStore(state.showTrayIcon),
            hotbarAutoHide: descriptors.hotbarAutoHide.toStore(state.hotbarAutoHide),
            shell: descriptors.shell.toStore(state.shell),
            syncKubeconfigEntries: descriptors.syncKubeconfigEntries.toStore(state.syncKubeconfigEntries),
            terminalConfig: descriptors.terminalConfig.toStore(state.terminalConfig),
            terminalCopyOnSelect: descriptors.terminalCopyOnSelect.toStore(state.terminalCopyOnSelect),
            terminalTheme: descriptors.terminalTheme.toStore(state.terminalTheme),
            clusterPageMenuOrder: descriptors.clusterPageMenuOrder.toStore(state.clusterPageMenuOrder),
          },
        }),
    });
  },
});

export default userPreferencesPersistentStorageInjectable;
