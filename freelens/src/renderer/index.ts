import "@freelens/core/styles";
import "@freelens/button/styles";
import "@freelens/error-boundary/styles";
import "@freelens/tooltip/styles";
import "@freelens/resizing-anchor/styles";
import "@freelens/icon/styles";
import "@freelens/animate/styles";
import "@freelens/notifications/styles";
import "@freelens/spinner/styles";

import { runInAction } from "mobx";
import {
  rendererExtensionApi as Renderer,
  commonExtensionApi as Common,
  registerLensCore,
  metricsFeature,
} from "@freelens/core/renderer";
import { autoRegister } from "@ogre-tools/injectable-extension-for-auto-registration";
import { registerFeature } from "@freelens/feature-core";
import {
  applicationFeature,
  startApplicationInjectionToken
} from "@freelens/application";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { registerInjectableReact } from "@ogre-tools/injectable-react";
import { messagingFeatureForRenderer } from "@freelens/messaging-for-renderer";
import { keyboardShortcutsFeature } from "@freelens/keyboard-shortcuts";
import { reactApplicationFeature } from "@freelens/react-application";
import { routingFeature } from "@freelens/routing";
import { loggerFeature } from "@freelens/logger";
import { animateFeature } from "@freelens/animate";
import { clusterSidebarFeature } from "@freelens/cluster-sidebar";
import { randomFeature } from "@freelens/random";
import { kubeApiSpecificsFeature } from "@freelens/kube-api-specifics";
import { notificationsFeature } from "@freelens/notifications";

const environment = "renderer";

const di = createContainer(environment, {
  detectCycles: false,
});

runInAction(() => {
  registerMobX(di);
  registerInjectableReact(di);
  registerLensCore(di, environment);

  registerFeature(
    di,
    loggerFeature,
  );

  registerFeature(
    di,
    applicationFeature,
    messagingFeatureForRenderer,
    keyboardShortcutsFeature,
    reactApplicationFeature,
    routingFeature,
    metricsFeature,
    animateFeature,
    clusterSidebarFeature,
    randomFeature,
    kubeApiSpecificsFeature,
    notificationsFeature,
  );

  autoRegister({
    di,
    targetModule: module,
    getRequireContexts: () => [
      require.context("./", true, CONTEXT_MATCHER_FOR_NON_FEATURES),
      require.context("../common", true, CONTEXT_MATCHER_FOR_NON_FEATURES),
    ],
  });
});

const startApplication = di.inject(startApplicationInjectionToken);

startApplication();

export {
  React,
  ReactDOM,
  ReactRouter,
  ReactRouterDom,
  Mobx,
  MobxReact,
} from "@freelens/core/renderer";

export const LensExtensions = {
  Renderer,
  Common,
};
