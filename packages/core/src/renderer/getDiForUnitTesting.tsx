/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { animateFeature, requestAnimationFrameInjectable } from "@freelensapp/animate";
import { clusterSidebarFeature } from "@freelensapp/cluster-sidebar";
import { registerFeature } from "@freelensapp/feature-core";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { setLegacyGlobalDiForExtensionApi } from "@freelensapp/legacy-global-di";
import { loggerFeature } from "@freelensapp/logger";
import { messagingFeature, testUtils as messagingTestUtils } from "@freelensapp/messaging";
import { notificationsFeature } from "@freelensapp/notifications";
import { randomFeature } from "@freelensapp/random";
import { routingFeature } from "@freelensapp/routing";
import { createContainer, isInjectable } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { registerInjectableReact } from "@ogre-tools/injectable-react";
import { chunk, noop } from "lodash/fp";
import { runInAction } from "mobx";
import { getOverrideFsWithFakes } from "../test-utils/override-fs-with-fakes";
import hostedClusterIdInjectable from "./cluster-frame-context/hosted-cluster-id.injectable";
import terminalSpawningPoolInjectable from "./components/dock/terminal/terminal-spawning-pool.injectable";
import startTopbarStateSyncInjectable from "./components/layout/top-bar/start-state-sync.injectable";
import legacyOnChannelListenInjectable from "./ipc/legacy-channel-listen.injectable";
import watchHistoryStateInjectable from "./remote-helpers/watch-history-state.injectable";

import type { GlobalOverride } from "@freelensapp/test-utils";

export const getDiForUnitTesting = () => {
  const environment = "renderer";
  const di = createContainer(environment, {
    detectCycles: false,
  });

  registerMobX(di);
  registerInjectableReact(di);
  setLegacyGlobalDiForExtensionApi(di, environment);

  runInAction(() => {
    registerFeature(
      di,
      messagingFeature,
      messagingTestUtils.messagingFeatureForUnitTesting,
      routingFeature,
      loggerFeature,
      animateFeature,
      clusterSidebarFeature,
      randomFeature,
      kubeApiSpecificsFeature,
      notificationsFeature,
    );
  });

  di.preventSideEffects();

  runInAction(() => {
    const injectables = global.injectablePaths.renderer.paths
      .map((path) => require(path))
      .flatMap(Object.values)
      .filter(isInjectable);

    for (const block of chunk(100)(injectables)) {
      di.register(...block);
    }
  });

  for (const globalOverridePath of global.injectablePaths.renderer.globalOverridePaths) {
    const globalOverride = require(globalOverridePath).default as GlobalOverride<unknown, unknown, unknown>;

    di.override(globalOverride.injectable, globalOverride.overridingInstantiate);
  }

  [startTopbarStateSyncInjectable].forEach((injectable) => {
    di.override(injectable, () => ({
      id: injectable.id,
      run: () => {},
    }));
  });

  di.override(terminalSpawningPoolInjectable, () => document.createElement("div"));
  di.override(hostedClusterIdInjectable, () => undefined);

  di.override(legacyOnChannelListenInjectable, () => () => noop);

  di.override(requestAnimationFrameInjectable, () => (callback) => callback());
  di.override(watchHistoryStateInjectable, () => () => () => {});

  getOverrideFsWithFakes()(di);

  return di;
};
