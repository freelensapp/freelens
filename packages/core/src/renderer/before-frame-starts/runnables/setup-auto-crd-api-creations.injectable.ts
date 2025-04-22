/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { KubeApi } from "@freelensapp/kube-api";
import { maybeKubeApiInjectable } from "@freelensapp/kube-api-specifics";
import type { CustomResourceDefinition } from "@freelensapp/kube-object";
import { KubeObject } from "@freelensapp/kube-object";
import { logErrorInjectionToken, logInfoInjectionToken, logWarningInjectionToken } from "@freelensapp/logger";
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { customResourceDefinitionApiInjectionToken } from "../../../common/k8s-api/api-manager/crd-api-token";
import { injectableDifferencingRegistratorWith } from "../../../common/utils/registrator-helper";
import customResourceDefinitionStoreInjectable from "../../components/custom-resource-definitions/store.injectable";
import { beforeClusterFrameStartsSecondInjectionToken } from "../tokens";

const setupAutoCrdApiCreationsInjectable = getInjectable({
  id: "setup-auto-crd-api-creations",
  instantiate: (di) => ({
    run: () => {
      const customResourceDefinitionStore = di.inject(customResourceDefinitionStoreInjectable);
      const injectableDifferencingRegistrator = injectableDifferencingRegistratorWith(di);

      reaction(
        () => customResourceDefinitionStore.getItems().map(toCrdApiInjectable),
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

const toCrdApiInjectable = (crd: CustomResourceDefinition) =>
  getInjectable({
    id: `default-kube-api-for-custom-resource-definition-${crd.getResourceApiBase()}`,
    instantiate: (di) => {
      const objectConstructor = class extends KubeObject {
        static readonly kind = crd.getResourceKind();
        static readonly namespaced = crd.isNamespaced();
        static readonly apiBase = crd.getResourceApiBase();
      };

      return new KubeApi(
        {
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
