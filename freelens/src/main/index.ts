import { applicationFeature, startApplicationInjectionToken } from "@freelensapp/application";
import { applicationFeatureForElectronMain } from "@freelensapp/application-for-electron-main";
import {
  assertExtensionApiSingletonNames,
  commonExtensionApi as Common,
  mainExtensionApi as Main,
  mainExtensionApiSingletonModuleIds,
  mainExtensionApiSingletons,
  registerLensCore,
} from "@freelensapp/core/main";
import { registerFeature } from "@freelensapp/feature-core";
import { kubeApiSpecificsFeature } from "@freelensapp/kube-api-specifics";
import { loggerFeature } from "@freelensapp/logger";
import { messagingFeatureForMain } from "@freelensapp/messaging-for-main";
import { prometheusFeature } from "@freelensapp/prometheus";
import { randomFeature } from "@freelensapp/random";
import { createContainer } from "@ogre-tools/injectable";
import { registerMobX } from "@ogre-tools/injectable-extension-for-mobx";
import { runInAction } from "mobx";
import { registerInjectables as registerCommonInjectables } from "../common/register-injectables";
import { registerInjectables as registerMainInjectables } from "./register-injectables";

const environment = "main";

const di = createContainer(environment);

// @ogre-tools 23 prevents side-effect injectables by default; the production
// container must opt back in to allow them.
di.permitSideEffects();

registerMobX(di);

runInAction(() => {
  registerLensCore(di, environment);

  registerFeature(
    di,
    loggerFeature,
    prometheusFeature,
    applicationFeature,
    applicationFeatureForElectronMain,
    messagingFeatureForMain,
    randomFeature,
    kubeApiSpecificsFeature,
  );

  registerMainInjectables(di);
  registerCommonInjectables(di);
});

const startApplication = di.inject(startApplicationInjectionToken);

startApplication().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Phase 4 (D5): expose the extension API through a runtime global so the
// published `@freelensapp/extensions` shim can re-export it in each process.
// Main gets `{ Common, Main }`; the renderer gets `{ Common, Renderer }`.
// The global's ambient type lives in `../freelens-extension-api.ts`.
//
// #2450: alongside the namespaces, main publishes the singletons it actually
// has -- `mobx` and `@ogre-tools/injectable` -- and not the five the renderer
// carries, which would pull a DOM renderer and a code editor into a bundle with
// no window. `packages/core/src/extensions/api-globals/main-singletons.ts` is
// where that split is argued.
//
// The assertion runs first because the failure it catches is silent: a key that
// does not match the rule deriving it from its module id publishes nothing an
// extension can find, and the extension reads `undefined` in a repository
// nobody here can fix.
assertExtensionApiSingletonNames(mainExtensionApiSingletons, mainExtensionApiSingletonModuleIds);

globalThis.FreelensExtensionApi = { Common, Main, ...mainExtensionApiSingletons };
