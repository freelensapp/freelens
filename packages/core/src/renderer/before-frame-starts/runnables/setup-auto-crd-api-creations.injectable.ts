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
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import customResourceDefinitionStoreInjectable from "../../components/custom-resource-definitions/store.injectable";
import { beforeClusterFrameStartsSecondInjectionToken } from "../tokens";

import type { CustomResourceDefinition } from "@freelensapp/kube-object";

import type { KubeApiResource } from "../../../common/rbac";

const setupAutoCrdApiCreationsInjectable = getInjectable({
  id: "setup-auto-crd-api-creations",
  instantiate: (di) => ({
    run: () => {
      const customResourceDefinitionStore = di.inject(customResourceDefinitionStoreInjectable);
      const hostedCluster = di.inject(hostedClusterInjectable);
      // Register against the root container so the CRD api ids stay bare (not
      // namespaced under this registrator by @ogre-tools 23).
      const injectableDifferencingRegistrator = injectableDifferencingRegistratorWith(
        di.inject(dependencyInjectionContainerInjectable),
      );

      // A user who may not list the definitions still gets the APIs of the
      // custom resources, from the discovery of the cluster. Only a refused
      // list falls back to it: an empty one means there is no definition.
      reaction(
        () =>
          customResourceDefinitionStore.failedLoading
            ? (hostedCluster?.knownResources ?? []).filter(isCustomResource).map(toDiscoveredApiInjectable)
            : customResourceDefinitionStore.getItems().flatMap(toCrdApiInjectables),
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

  return [...versions].map((version) =>
    toCustomResourceApiInjectable({
      kind: crd.getResourceKind(),
      namespaced: crd.isNamespaced(),
      apiBase: crd.getResourceApiBase(version),
    }),
  );
};

// The groups that Kubernetes defines itself. A group without a dot is one of
// them too, because the API server refuses a definition of a custom resource
// in such a group.
const kubernetesApiGroups = new Set([
  "admissionregistration.k8s.io",
  "apiextensions.k8s.io",
  "apiregistration.k8s.io",
  "authentication.k8s.io",
  "authorization.k8s.io",
  "certificates.k8s.io",
  "coordination.k8s.io",
  "custom.metrics.k8s.io",
  "discovery.k8s.io",
  "events.k8s.io",
  "external.metrics.k8s.io",
  "flowcontrol.apiserver.k8s.io",
  "internal.apiserver.k8s.io",
  "metrics.k8s.io",
  "networking.k8s.io",
  "node.k8s.io",
  "rbac.authorization.k8s.io",
  "resource.k8s.io",
  "scheduling.k8s.io",
  "storage.k8s.io",
  "storagemigration.k8s.io",
]);

// Discovery lists every resource the cluster serves, in every version it
// serves, subresources such as `<plural>/status` included, and does not say
// which of them are custom.
const isCustomResource = ({ group, apiName }: KubeApiResource) =>
  group.includes(".") && !kubernetesApiGroups.has(group) && !apiName.includes("/");

// The same id as the API of a definition for the same version, so that the API
// and its store stay when the definitions can be listed again.
const toDiscoveredApiInjectable = ({ kind, namespaced, group, version, apiName }: KubeApiResource) =>
  toCustomResourceApiInjectable({ kind, namespaced, apiBase: `/apis/${group}/${version}/${apiName}` });

interface CustomResourceApiDescriptor {
  kind: string;
  namespaced: boolean;
  apiBase: string;
}

const toCustomResourceApiInjectable = ({ kind, namespaced, apiBase }: CustomResourceApiDescriptor) =>
  getInjectable({
    id: `default-kube-api-for-custom-resource-definition-${apiBase}`,
    instantiate: (di) => {
      const objectConstructor = class extends KubeObject {
        static readonly kind = kind;
        static readonly namespaced = namespaced;
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
