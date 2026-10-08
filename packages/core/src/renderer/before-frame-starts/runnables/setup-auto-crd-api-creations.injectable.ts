/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeApi } from "@freelensapp/kube-api";
import { maybeKubeApiInjectable } from "@freelensapp/kube-api-specifics";
import { KubeObject } from "@freelensapp/kube-object";
import {
  logDebugInjectionToken,
  logErrorInjectionToken,
  logInfoInjectionToken,
  logWarningInjectionToken,
} from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import dependencyInjectionContainerInjectable from "../../../common/dependency-injection/dependency-injection-container.injectable";
import { customResourceDefinitionApiInjectionToken } from "../../../common/k8s-api/api-manager/crd-api-token";
import { injectableDifferencingRegistratorWith } from "../../../common/utils/registrator-helper";
import customResourceDefinitionStoreInjectable from "../../components/custom-resource-definitions/store.injectable";
import { beforeClusterFrameStartsSecondInjectionToken } from "../tokens";

import type { CustomResourceDefinition } from "@freelensapp/kube-object";

const setupAutoCrdApiCreationsInjectable = getInjectable({
  id: "setup-auto-crd-api-creations",
  instantiate: (di) => ({
    run: () => {
      const customResourceDefinitionStore = di.inject(customResourceDefinitionStoreInjectable);
      // Register against the root container so the CRD api ids stay bare (not
      // namespaced under this registrator by @ogre-tools 23).
      const injectableDifferencingRegistrator = injectableDifferencingRegistratorWith(
        di.inject(dependencyInjectionContainerInjectable),
      );

      reaction(
        () => customResourceDefinitionStore.getItems().flatMap(toCrdApiInjectables),
        injectableDifferencingRegistrator,
        {
          fireImmediately: true,
        },
      );
    },
  }),
  injectionToken: beforeClusterFrameStartsSecondInjectionToken,
});

export default setupAutoCrdApiCreationsInjectable;

// One API for every served version, so that an object of any of them, or an
// extension that names one, finds its API. The preferred version always gets
// one, served or not: the custom resources view reads through it, and says so
// when it is not served.
const toCrdApiInjectables = (crd: CustomResourceDefinition) => {
  const versions = new Set([crd.getVersion(), ...crd.getServedVersions().map((version) => version.name)]);

  return [...versions].map((version) => toCrdApiInjectable(crd, crd.getResourceApiBase(version)));
};

const toCrdApiInjectable = (crd: CustomResourceDefinition, apiBase: string) =>
  getInjectable({
    id: `default-kube-api-for-custom-resource-definition-${apiBase}`,
    instantiate: (di) => {
      const objectConstructor = class extends KubeObject {
        static readonly kind = crd.getResourceKind();
        static readonly namespaced = crd.isNamespaced();
        static readonly apiBase = apiBase;
      };

      return new KubeApi(
        {
          logDebug: di.inject(logDebugInjectionToken),
          logError: di.inject(logErrorInjectionToken),
          logInfo: di.inject(logInfoInjectionToken),
          logWarn: di.inject(logWarningInjectionToken),
          maybeKubeApi: di.inject(maybeKubeApiInjectable),
        },
        { objectConstructor },
      );
    },
    injectionToken: customResourceDefinitionApiInjectionToken,
  });
