/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { lensBuildEnvironmentInjectionToken } from "@freelensapp/application";
import { issuesTrackerUrl } from "../../common/vars";
import appNameInjectable from "../../common/vars/app-name.injectable";
import isFlatpakPackageInjectable from "../../common/vars/is-flatpak-package.injectable";
import isLinuxInjectable from "../../common/vars/is-linux.injectable";
import isMacInjectable from "../../common/vars/is-mac.injectable";
import isSnapPackageInjectable from "../../common/vars/is-snap-package.injectable";
import isWindowsInjectable from "../../common/vars/is-windows.injectable";
import enabledExtensionsInjectable from "../../features/extensions/enabled/common/enabled-extensions.injectable";
import overviewStyleInjectable from "../../features/user-preferences/common/overview-style.injectable";
import userPreferencesStateInjectable, {
  type UserPreferencesState,
} from "../../features/user-preferences/common/state.injectable";
import { buildVersionInitializable } from "../../features/vars/build-version/common/token";
import { asLazyInjectedForExtensionApi, getDiForExtensionApi } from "../extension-api-di";

import type { OverviewStylePreference } from "../../features/user-preferences/common/preferences-helpers";

export type { UserPreferencesState };

const userStore = asLazyInjectedForExtensionApi(userPreferencesStateInjectable);
const enabledExtensions = asLazyInjectedForExtensionApi(enabledExtensionsInjectable);
const overviewStyle = asLazyInjectedForExtensionApi(overviewStyleInjectable);

export const App = {
  Preferences: {
    getKubectlPath: () => userStore.kubectlBinariesPath,
    /**
     * How the user chose to see the cluster and workloads overviews: `"charts"`, the default, or
     * `"cards"`. Observable: an `observer` component that calls it renders again when the user
     * switches.
     */
    getOverviewStyle: (): OverviewStylePreference => overviewStyle.get(),
  },
  getEnabledExtensions: () => enabledExtensions.get(),
  get version() {
    const di = getDiForExtensionApi();

    return di.inject(buildVersionInitializable.stateToken);
  },
  get appName() {
    const di = getDiForExtensionApi();

    return di.inject(appNameInjectable);
  },
  get isFlatpak() {
    const di = getDiForExtensionApi();

    return di.inject(isFlatpakPackageInjectable);
  },
  get isSnap() {
    const di = getDiForExtensionApi();

    return di.inject(isSnapPackageInjectable);
  },
  get isWindows() {
    const di = getDiForExtensionApi();

    return di.inject(isWindowsInjectable);
  },
  get isMac() {
    const di = getDiForExtensionApi();

    return di.inject(isMacInjectable);
  },
  get isLinux() {
    const di = getDiForExtensionApi();

    return di.inject(isLinuxInjectable);
  },
  get lensBuildEnvironment() {
    const di = getDiForExtensionApi();

    return di.inject(lensBuildEnvironmentInjectionToken);
  },
  issuesTrackerUrl,
} as const;
