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
  assertExtensionApiSingletonNames,
  commonExtensionApi as Common,
  metricsFeature,
  rendererExtensionApi as Renderer,
  registerLensCore,
  rendererExtensionApiSingletonModuleIds,
  rendererExtensionApiSingletons,
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
import { runInAction } from "mobx";
import { registerInjectables as registerCommonInjectables } from "../common/register-injectables";
import { registerInjectables as registerRendererInjectables } from "./register-injectables";

const environment = "renderer";

const di = createContainer(environment);

// @ogre-tools 23 prevents side-effect injectables by default; the production
// container must opt back in to allow them.
di.permitSideEffects();

runInAction(() => {
  registerMobX(di);
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

export { Mobx, MobxReact, React, ReactDOM, ReactJsxRuntime } from "@freelensapp/core/renderer";

// Phase 4 (D5): expose the extension API through a runtime global so the
// published `@freelensapp/extensions` shim can re-export it in each process.
// The renderer gets `{ Common, Renderer }`; main gets `{ Common, Main }`.
// The global's ambient type lives in `../freelens-extension-api.ts`.
//
// #2450: alongside the namespaces, the renderer publishes all eight singletons
// of the contract -- the modules an extension must share with the host rather
// than bundle. `packages/core/src/extensions/api-globals/renderer-singletons.ts`
// says which and why; main publishes only the subset it has.
//
// The assertion runs first because the failure it catches is silent: a key that
// does not match the rule deriving it from its module id publishes nothing an
// extension can find, and the extension reads `undefined` in a repository
// nobody here can fix.
assertExtensionApiSingletonNames(rendererExtensionApiSingletons, rendererExtensionApiSingletonModuleIds);

globalThis.FreelensExtensionApi = { Common, Renderer, ...rendererExtensionApiSingletons };

export const LensExtensions = {
  Renderer,
  Common,
};
