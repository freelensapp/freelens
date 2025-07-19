/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { lensBuildEnvironmentInjectionToken } from "@freelensapp/application";
import { asLegacyGlobalForExtensionApi, getLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import { issuesTrackerUrl } from "../../common/vars";
import appNameInjectable from "../../common/vars/app-name.injectable";
import isFlatpakPackageInjectable from "../../common/vars/is-flatpak-package.injectable";
import isLinuxInjectable from "../../common/vars/is-linux.injectable";
import isMacInjectable from "../../common/vars/is-mac.injectable";
import isSnapPackageInjectable from "../../common/vars/is-snap-package.injectable";
import isWindowsInjectable from "../../common/vars/is-windows.injectable";
import enabledExtensionsInjectable from "../../features/extensions/enabled/common/enabled-extensions.injectable";
import userPreferencesStateInjectable, {
  type UserPreferencesState,
} from "../../features/user-preferences/common/state.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";

export type { UserPreferencesState };

const userStore = asLegacyGlobalForExtensionApi(userPreferencesStateInjectable);
const enabledExtensions = asLegacyGlobalForExtensionApi(enabledExtensionsInjectable);

export const App = {
  Preferences: {
    getKubectlPath: () => userStore.kubectlBinariesPath,
  },
  getEnabledExtensions: () => enabledExtensions.get(),
  get version() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(buildVersionInitializable.stateToken);
  },
  get appName() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(appNameInjectable);
  },
  get isFlatpak() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(isFlatpakPackageInjectable);
  },
  get isSnap() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(isSnapPackageInjectable);
  },
  get isWindows() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(isWindowsInjectable);
  },
  get isMac() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(isMacInjectable);
  },
  get isLinux() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(isLinuxInjectable);
  },
  get lensBuildEnvironment() {
    const di = getLegacyGlobalDiForExtensionApi();

    return di.inject(lensBuildEnvironmentInjectionToken);
  },
  /**
   * @deprecated This value is now `""` and is left here for backwards compatibility.
   */
  slackUrl: "",
  issuesTrackerUrl,
} as const;
