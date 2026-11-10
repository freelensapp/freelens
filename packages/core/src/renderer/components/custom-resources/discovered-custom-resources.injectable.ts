/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { uniqBy } from "es-toolkit";
import { computed } from "mobx";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import customResourceDefinitionStoreInjectable from "../custom-resource-definitions/store.injectable";

import type { KubeApiResource } from "../../../common/rbac";

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

// The custom resources of the cluster, from its discovery, in every version it
// serves them, for a user who may not list the definitions. Only a refused list
// falls back to them: an empty one means there is no definition, so this is
// empty then, as it is while the definitions can be listed.
const discoveredCustomResourcesInjectable = getInjectable({
  id: "discovered-custom-resources",
  instantiate: (di) => {
    const customResourceDefinitionStore = di.inject(customResourceDefinitionStoreInjectable);
    const hostedCluster = di.inject(hostedClusterInjectable);

    return computed(() =>
      customResourceDefinitionStore.failedLoading ? (hostedCluster?.knownResources ?? []).filter(isCustomResource) : [],
    );
  },
});

export default discoveredCustomResourcesInjectable;

export const getDiscoveredApiBase = ({ group, version, apiName }: KubeApiResource) =>
  `/apis/${group}/${version}/${apiName}`;

// One entry for every custom resource, in its preferred version: the API server
// lists the versions of a group in the order of its preference, and discovery
// keeps that order.
export const inPreferredVersions = (resources: KubeApiResource[]) =>
  uniqBy(resources, ({ group, apiName }) => `${group}/${apiName}`);
