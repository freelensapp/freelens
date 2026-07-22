/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { registerFeature } from "@freelensapp/feature-core";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { loggerFeature } from "@freelensapp/logger";
import { messagingFeature, testUtils as messagingTestUtils } from "@freelensapp/messaging";
import { notificationsFeature } from "@freelensapp/notifications";
import { randomFeature } from "@freelensapp/random";
import { createContainer, isInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { chunk } from "es-toolkit";
import { runInAction } from "mobx";
import broadcastMessageInjectable from "../common/ipc/broadcast-message.injectable";
import { setDiForExtensionApi } from "../extensions/extension-api-di";
import setupSyncingOfWeblinksInjectable from "../features/weblinks/main/setup-syncing-of-weblinks.injectable";
import { getOverrideFsWithFakes } from "../test-utils/override-fs-with-fakes";
import spawnInjectable from "./child-process/spawn.injectable";
import initializeClusterManagerInjectable from "./cluster/initialize-manager.injectable";
import setupApplicationNameInjectable from "./electron-app/runnables/setup-application-name.injectable";
import setupDeepLinkingInjectable from "./electron-app/runnables/setup-deep-linking.injectable";
import setupDeviceShutdownInjectable from "./electron-app/runnables/setup-device-shutdown.injectable";
import setupIpcMainHandlersInjectable from "./electron-app/runnables/setup-ipc-main-handlers/setup-ipc-main-handlers.injectable";
import setupMainWindowVisibilityAfterActivationInjectable from "./electron-app/runnables/setup-main-window-visibility-after-activation.injectable";
import waitUntilBundledExtensionsAreLoadedInjectable from "./start-main-application/lens-window/application-window/wait-until-bundled-extensions-are-loaded.injectable";
import initializeExtensionsInjectable from "./start-main-application/runnables/initialize-extensions.injectable";
import setupLensProxyInjectable from "./start-main-application/runnables/setup-lens-proxy.injectable";
import setupSessionProxyBypassInjectable from "./start-main-application/runnables/setup-session-proxy-bypass.injectable";

import type { GlobalOverride } from "@freelensapp/test-utils";

import type { DiContainer } from "@ogre-tools/injectable";

// The injectable files must be loaded through Vite's transform pipeline
// (import.meta.glob), not native require(path): the source-only workspace
// packages they import use extensionless specifiers that only Vite resolves.
const injectableModules = import.meta.glob<object>(
  [
    "../common/**/*.injectable.{ts,tsx}",
    "../extensions/**/*.injectable.{ts,tsx}",
    "./**/*.injectable.{ts,tsx}",
    "../test-env/**/*.injectable.{ts,tsx}",
    "../features/**/main/**/*.injectable.{ts,tsx}",
    "../features/**/common/**/*.injectable.{ts,tsx}",
  ],
  { eager: true },
);

const globalOverrideModules = import.meta.glob<{ default: GlobalOverride<unknown, unknown, unknown> }>(
  [
    "../common/**/*.global-override-for-injectable.{ts,tsx}",
    "../extensions/**/*.global-override-for-injectable.{ts,tsx}",
    "./**/*.global-override-for-injectable.{ts,tsx}",
    "../test-env/**/*.global-override-for-injectable.{ts,tsx}",
    "../features/**/main/**/*.global-override-for-injectable.{ts,tsx}",
    "../features/**/common/**/*.global-override-for-injectable.{ts,tsx}",
  ],
  { eager: true },
);

export function getDiForUnitTesting() {
  const environment = "main";
  const di = createContainer(environment);

  registerMobX(di);
  setDiForExtensionApi(di, environment);

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

  runInAction(() => {
    const injectables = Object.values(injectableModules).flatMap(Object.values).filter(isInjectable);

    for (const block of chunk(injectables, 100)) {
      di.register(...block);
    }
  });

  for (const globalOverride of Object.values(globalOverrideModules).map((module) => module.default)) {
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
      stderr: { on: vi.fn(), removeAllListeners: vi.fn() },
      stdout: { on: vi.fn(), removeAllListeners: vi.fn() },
      on: vi.fn(),
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
    setupSessionProxyBypassInjectable,
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
};
