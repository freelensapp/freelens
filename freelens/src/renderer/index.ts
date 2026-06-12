import "@freelensapp/core/styles";
import "@freelensapp/button/styles";
import "@freelensapp/error-boundary/styles";
import "@freelensapp/tooltip/styles";
import "@freelensapp/resizing-anchor/styles";
import "@freelensapp/icon/styles";
import "@freelensapp/animate/styles";
import "@freelensapp/notifications/styles";
import "@freelensapp/spinner/styles";

import { animateFeature } from "@freelensapp/animate";
import { applicationFeature, startApplicationInjectionToken } from "@freelensapp/application";
import { clusterSidebarFeature } from "@freelensapp/cluster-sidebar";
import {
  commonExtensionApi as Common,
  metricsFeature,
  rendererExtensionApi as Renderer,
  registerLensCore,
} from "@freelensapp/core/renderer";
import { registerFeature } from "@freelensapp/feature-core";
import { keyboardShortcutsFeature } from "@freelensapp/keyboard-shortcuts";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { loggerFeature } from "@freelensapp/logger";
import { messagingFeatureForRenderer } from "@freelensapp/messaging-for-renderer";
import { notificationsFeature } from "@freelensapp/notifications";
import { randomFeature } from "@freelensapp/random";
import { reactApplicationFeature } from "@freelensapp/react-application";
import { routingFeature } from "@freelensapp/routing";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { registerInjectableReact } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { registerInjectables as registerCommonInjectables } from "../common/register-injectables";
import { registerInjectables as registerRendererInjectables } from "./register-injectables";

const environment = "renderer";

const di = createContainer(environment, {
  detectCycles: false,
});

runInAction(() => {
  registerMobX(di);
  registerInjectableReact(di);
  registerLensCore(di, environment);

  registerFeature(di, loggerFeature);

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

  registerRendererInjectables(di);
  registerCommonInjectables(di);
});

const startApplication = di.inject(startApplicationInjectionToken);

startApplication();

export {
  Mobx,
  MobxReact,
  React,
  ReactDOM,
  ReactJsxRuntime,
  ReactRouter,
  ReactRouterDom,
} from "@freelensapp/core/renderer";

export const LensExtensions = {
  Renderer,
  Common,
};
