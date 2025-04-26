/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { registerFeature } from "@freelensapp/feature-core";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { setLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import { loggerFeature } from "@freelensapp/logger";
import { messagingFeature, testUtils as messagingTestUtils } from "@freelensapp/messaging";
import { notificationsFeature } from "@freelensapp/notifications";
import { randomFeature } from "@freelensapp/random";
import type { GlobalOverride } from "@freelensapp/test-utils";
import type { DiContainer } from "@ogre-tools/injectable";
import { createContainer, isInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { chunk } from "lodash/fp";
import { runInAction } from "mobx";
import broadcastMessageInjectable from "../common/ipc/broadcast-message.injectable";
import setupSyncingOfWeblinksInjectable from "../features/weblinks/main/setup-syncing-of-weblinks.injectable";
import { getOverrideFsWithFakes } from "../test-utils/override-fs-with-fakes";
import spawnInjectable from "./child-process/spawn.injectable";
import initializeClusterManagerInjectable from "./cluster/initialize-manager.injectable";
import electronQuitAndInstallUpdateInjectable from "./electron-app/features/electron-quit-and-install-update.injectable";
import electronUpdaterIsActiveInjectable from "./electron-app/features/electron-updater-is-active.injectable";
import setUpdateOnQuitInjectable from "./electron-app/features/set-update-on-quit.injectable";
import setupApplicationNameInjectable from "./electron-app/runnables/setup-application-name.injectable";
import setupDeepLinkingInjectable from "./electron-app/runnables/setup-deep-linking.injectable";
import setupDeviceShutdownInjectable from "./electron-app/runnables/setup-device-shutdown.injectable";
import setupIpcMainHandlersInjectable from "./electron-app/runnables/setup-ipc-main-handlers/setup-ipc-main-handlers.injectable";
import setupMainWindowVisibilityAfterActivationInjectable from "./electron-app/runnables/setup-main-window-visibility-after-activation.injectable";
import waitUntilBundledExtensionsAreLoadedInjectable from "./start-main-application/lens-window/application-window/wait-until-bundled-extensions-are-loaded.injectable";
import initializeExtensionsInjectable from "./start-main-application/runnables/initialize-extensions.injectable";
import setupLensProxyInjectable from "./start-main-application/runnables/setup-lens-proxy.injectable";

export function getDiForUnitTesting() {
  const environment = "main";
  const di = createContainer(environment, {
    detectCycles: false,
  });

  registerMobX(di);
  setLegacyGlobalDiForExtensionApi(di, environment);

  runInAction(() => {
    registerFeature(
      di,
      messagingFeature,
      messagingTestUtils.messagingFeatureForUnitTesting,
      loggerFeature,
      randomFeature,
      kubeApiSpecificsFeature,
      notificationsFeature,
    );
  });

  di.preventSideEffects();

  runInAction(() => {
    const injectables = global.injectablePaths.main.paths
      .map((path) => require(path))
      .flatMap(Object.values)
      .filter(isInjectable);

    for (const block of chunk(100)(injectables)) {
      di.register(...block);
    }
  });

  for (const globalOverridePath of global.injectablePaths.main.globalOverridePaths) {
    const globalOverride = require(globalOverridePath).default as GlobalOverride<unknown, unknown, unknown>;

    di.override(globalOverride.injectable, globalOverride.overridingInstantiate);
  }

  di.override(waitUntilBundledExtensionsAreLoadedInjectable, () => async () => {});

  overrideRunnablesHavingSideEffects(di);
  overrideElectronFeatures(di);
  getOverrideFsWithFakes()(di);

  di.override(broadcastMessageInjectable, () => (channel) => {
    throw new Error(`Tried to broadcast message to channel "${channel}" over IPC without explicit override.`);
  });
  di.override(spawnInjectable, () => () => {
    return {
      stderr: { on: jest.fn(), removeAllListeners: jest.fn() },
      stdout: { on: jest.fn(), removeAllListeners: jest.fn() },
      on: jest.fn(),
    } as never;
  });

  return di;
}

// TODO: Reorganize code in Runnables to get rid of requirement for override
const overrideRunnablesHavingSideEffects = (di: DiContainer) => {
  [
    initializeExtensionsInjectable,
    initializeClusterManagerInjectable,
    setupIpcMainHandlersInjectable,
    setupLensProxyInjectable,
    setupSyncingOfWeblinksInjectable,
  ].forEach((injectable) => {
    di.override(injectable, () => ({
      id: injectable.id,
      run: () => {},
    }));
  });
};

const overrideElectronFeatures = (di: DiContainer) => {
  [
    setupMainWindowVisibilityAfterActivationInjectable,
    setupDeviceShutdownInjectable,
    setupDeepLinkingInjectable,
    setupApplicationNameInjectable,
  ].forEach((injectable) => {
    di.override(injectable, () => ({
      id: injectable.id,
      run: () => {},
    }));
  });

  di.override(electronQuitAndInstallUpdateInjectable, () => () => {});
  di.override(setUpdateOnQuitInjectable, () => () => {});
  di.override(electronUpdaterIsActiveInjectable, () => false);
};
