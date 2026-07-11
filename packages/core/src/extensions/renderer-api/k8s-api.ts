/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import * as kubeApiSpecifics from "@freelensapp/kube-api-specifics";
import requestMetricsInjectable from "../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
import { apiResourceRecord } from "../../common/rbac";
import { shouldShowResourceInjectionToken } from "../../features/cluster/showing-kube-resources/common/allowed-resources-injection-token";
import horizontalPodAutoscalerStoreInjectable from "../../renderer/components/config-horizontal-pod-autoscalers/store.injectable";
import limitRangeStoreInjectable from "../../renderer/components/config-limit-ranges/store.injectable";
import configMapStoreInjectable from "../../renderer/components/config-maps/store.injectable";
import podDisruptionBudgetStoreInjectable from "../../renderer/components/config-pod-disruption-budgets/store.injectable";
import priorityClassStoreInjectable from "../../renderer/components/config-priority-classes/store.injectable";
import resourceQuotaStoreInjectable from "../../renderer/components/config-resource-quotas/store.injectable";
import secretStoreInjectable from "../../renderer/components/config-secrets/store.injectable";
import verticalPodAutoscalerStoreInjectable from "../../renderer/components/config-vertical-pod-autoscalers/store.injectable";
import customResourceDefinitionStoreInjectable from "../../renderer/components/custom-resource-definitions/store.injectable";
import eventStoreInjectable from "../../renderer/components/events/store.injectable";
import namespaceStoreInjectable from "../../renderer/components/namespaces/store.injectable";
import endpointSliceStoreInjectable from "../../renderer/components/network-endpoint-slices/store.injectable";
import endpointsStoreInjectable from "../../renderer/components/network-endpoints/store.injectable";
import ingressStoreInjectable from "../../renderer/components/network-ingresses/ingress-store.injectable";
import networkPolicyStoreInjectable from "../../renderer/components/network-policies/store.injectable";
import serviceStoreInjectable from "../../renderer/components/network-services/store.injectable";
import nodeStoreInjectable from "../../renderer/components/nodes/store.injectable";
import storageClassStoreInjectable from "../../renderer/components/storage-classes/store.injectable";
import persistentVolumeClaimStoreInjectable from "../../renderer/components/storage-volume-claims/store.injectable";
import persistentVolumeStoreInjectable from "../../renderer/components/storage-volumes/store.injectable";
import clusterRoleBindingStoreInjectable from "../../renderer/components/user-management/cluster-role-bindings/store.injectable";
import clusterRoleStoreInjectable from "../../renderer/components/user-management/cluster-roles/store.injectable";
import roleBindingStoreInjectable from "../../renderer/components/user-management/role-bindings/store.injectable";
import roleStoreInjectable from "../../renderer/components/user-management/roles/store.injectable";
import serviceAccountStoreInjectable from "../../renderer/components/user-management/service-accounts/store.injectable";
import cronJobStoreInjectable from "../../renderer/components/workloads-cronjobs/store.injectable";
import daemonSetStoreInjectable from "../../renderer/components/workloads-daemonsets/store.injectable";
import deploymentStoreInjectable from "../../renderer/components/workloads-deployments/store.injectable";
import jobStoreInjectable from "../../renderer/components/workloads-jobs/store.injectable";
import podStoreInjectable from "../../renderer/components/workloads-pods/store.injectable";
import replicaSetStoreInjectable from "../../renderer/components/workloads-replicasets/store.injectable";
import statefulSetStoreInjectable from "../../renderer/components/workloads-statefulsets/store.injectable";
import {
  asLazyInjectedForExtensionApi,
  asLazyInjectedFunctionForExtensionApi,
  getDiForExtensionApi,
} from "../extension-api-di";

import type { KubeResource } from "../../common/rbac";

export function isAllowedResource(resources: KubeResource | KubeResource[]) {
  const di = getDiForExtensionApi();

  return [resources].flat().every((resourceName) => {
    const resource = apiResourceRecord[resourceName];

    if (!resource) {
      return true;
    }

    const _isAllowedResource = di.inject(shouldShowResourceInjectionToken, {
      apiName: resourceName,
      group: resource.group,
    });

    // Note: Legacy isAllowedResource does not advertise reactivity
    return _isAllowedResource.get();
  });
}

export const clusterRoleApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.clusterRoleApiInjectable);
export const clusterRoleBindingApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.clusterRoleBindingApiInjectable);
export const configMapApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.configMapApiInjectable);
export const crdApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.customResourceDefinitionApiInjectable);
export const cronJobApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.cronJobApiInjectable);
export const daemonSetApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.daemonSetApiInjectable);
export const deploymentApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.deploymentApiInjectable);
export const endpointApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.endpointsApiInjectable);
export const endpointSliceApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.endpointSliceApiInjectable);
export const eventApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.kubeEventApiInjectable);
export const hpaApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.horizontalPodAutoscalerApiInjectable);
export const ingressApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.ingressApiInjectable);
export const jobApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.jobApiInjectable);
export const limitRangeApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.limitRangeApiInjectable);
export const namespacesApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.namespaceApiInjectable);
export const networkPolicyApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.networkPolicyApiInjectable);
export const nodesApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.nodeApiInjectable);
export const nodesMetricsApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.nodeMetricsApiInjectable);
export const pcApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.priorityClassApiInjectable);
export const pdbApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.podDisruptionBudgetApiInjectable);
export const persistentVolumeApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.persistentVolumeApiInjectable);
export const podsApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.podApiInjectable);
export const podsMetricsApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.podMetricsApiInjectable);
export const priorityClassApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.priorityClassApiInjectable);
export const pvcApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.persistentVolumeClaimApiInjectable);
export const replicaSetApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.replicaSetApiInjectable);
export const resourceQuotaApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.resourceQuotaApiInjectable);
export const roleApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.roleApiInjectable);
export const roleBindingApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.roleBindingApiInjectable);
export const secretsApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.secretApiInjectable);
export const serviceAccountsApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.serviceAccountApiInjectable);
export const serviceApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.serviceApiInjectable);
export const statefulSetApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.statefulSetApiInjectable);
export const storageClassApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.storageClassApiInjectable);
export const vpaApi = asLazyInjectedForExtensionApi(kubeApiSpecifics.verticalPodAutoscalerApiInjectable);

export const clusterRoleStore = asLazyInjectedForExtensionApi(clusterRoleStoreInjectable);
export const clusterRoleBindingStore = asLazyInjectedForExtensionApi(clusterRoleBindingStoreInjectable);
export const configMapStore = asLazyInjectedForExtensionApi(configMapStoreInjectable);
export const crdStore = asLazyInjectedForExtensionApi(customResourceDefinitionStoreInjectable);
export const cronJobStore = asLazyInjectedForExtensionApi(cronJobStoreInjectable);
export const daemonSetStore = asLazyInjectedForExtensionApi(daemonSetStoreInjectable);
export const deploymentStore = asLazyInjectedForExtensionApi(deploymentStoreInjectable);
export const endpointStore = asLazyInjectedForExtensionApi(endpointsStoreInjectable);
export const endpointSliceStore = asLazyInjectedForExtensionApi(endpointSliceStoreInjectable);
export const eventStore = asLazyInjectedForExtensionApi(eventStoreInjectable);
export const hpaStore = asLazyInjectedForExtensionApi(horizontalPodAutoscalerStoreInjectable);
export const ingressStore = asLazyInjectedForExtensionApi(ingressStoreInjectable);
export const jobStore = asLazyInjectedForExtensionApi(jobStoreInjectable);
export const limitRangeStore = asLazyInjectedForExtensionApi(limitRangeStoreInjectable);
export const namespaceStore = asLazyInjectedForExtensionApi(namespaceStoreInjectable);
export const networkPolicyStore = asLazyInjectedForExtensionApi(networkPolicyStoreInjectable);
export const nodesStore = asLazyInjectedForExtensionApi(nodeStoreInjectable);
export const pcStore = asLazyInjectedForExtensionApi(priorityClassStoreInjectable);
export const pdbStore = asLazyInjectedForExtensionApi(podDisruptionBudgetStoreInjectable);
export const persistentVolumeStore = asLazyInjectedForExtensionApi(persistentVolumeStoreInjectable);
export const podsStore = asLazyInjectedForExtensionApi(podStoreInjectable);
export const pvcStore = asLazyInjectedForExtensionApi(persistentVolumeClaimStoreInjectable);
export const replicaSetStore = asLazyInjectedForExtensionApi(replicaSetStoreInjectable);
export const resourceQuotaStore = asLazyInjectedForExtensionApi(resourceQuotaStoreInjectable);
export const roleStore = asLazyInjectedForExtensionApi(roleStoreInjectable);
export const roleBindingStore = asLazyInjectedForExtensionApi(roleBindingStoreInjectable);
export const secretsStore = asLazyInjectedForExtensionApi(secretStoreInjectable);
export const serviceAccountsStore = asLazyInjectedForExtensionApi(serviceAccountStoreInjectable);
export const serviceStore = asLazyInjectedForExtensionApi(serviceStoreInjectable);
export const statefulSetStore = asLazyInjectedForExtensionApi(statefulSetStoreInjectable);
export const storageClassStore = asLazyInjectedForExtensionApi(storageClassStoreInjectable);
export const vpaStore = asLazyInjectedForExtensionApi(verticalPodAutoscalerStoreInjectable);

export * from "../common-api/k8s-api";

export type {
  ClusterRoleApi,
  ClusterRoleBindingApi,
  ConfigMapApi,
  CronJobApi,
  CustomResourceDefinitionApi,
  DaemonSetApi,
  DeploymentApi,
  EndpointSliceApi,
  EndpointsApi,
  HorizontalPodAutoscalerApi,
  IngressApi,
  JobApi,
  KubeEventApi,
  LimitRangeApi,
  NamespaceApi,
  NetworkPolicyApi,
  NodeApi,
  NodeMetricsApi,
  PersistentVolumeApi,
  PersistentVolumeClaimApi,
  PodApi,
  PodDisruptionBudgetApi,
  PodMetricsApi,
  PriorityClassApi,
  ReplicaSetApi,
  ResourceQuotaApi,
  RoleApi,
  RoleBindingApi,
  SecretApi,
  ServiceAccountApi,
  ServiceApi,
  StatefulSetApi,
  StorageClassApi,
  VerticalPodAutoscalerApi,
} from "@freelensapp/kube-api";

export const requestMetrics = asLazyInjectedFunctionForExtensionApi(requestMetricsInjectable);

export {
  CustomResourceStore,
  CustomResourceStore as CRDResourceStore,
} from "../../common/k8s-api/api-manager/resource.store";
export {
  type KubeObjectStatus,
  KubeObjectStatusLevel,
} from "../../common/k8s-api/kube-object-status";
export {
  HorizontalPodAutoscalerStore,
  HorizontalPodAutoscalerStore as HPAStore,
} from "../../renderer/components/config-horizontal-pod-autoscalers/store";
export {
  LimitRangeStore,
  LimitRangeStore as LimitRangesStore,
} from "../../renderer/components/config-limit-ranges/store";
export { ConfigMapStore, ConfigMapStore as ConfigMapsStore } from "../../renderer/components/config-maps/store";
export {
  PodDisruptionBudgetStore,
  PodDisruptionBudgetStore as PodDisruptionBudgetsStore,
} from "../../renderer/components/config-pod-disruption-budgets/store";
export {
  PriorityClassStore,
  PriorityClassStore as PriorityClassStoreStore,
} from "../../renderer/components/config-priority-classes/store";
export {
  ResourceQuotaStore as ResourceQuotasStore,
  ResourceQuotaStore,
} from "../../renderer/components/config-resource-quotas/store";
export { SecretStore, SecretStore as SecretsStore } from "../../renderer/components/config-secrets/store";
export { VerticalPodAutoscalerStore } from "../../renderer/components/config-vertical-pod-autoscalers/store";
export {
  CustomResourceDefinitionStore,
  CustomResourceDefinitionStore as CRDStore,
} from "../../renderer/components/custom-resource-definitions/store";
export { EventStore } from "../../renderer/components/events/store";
export { NamespaceStore } from "../../renderer/components/namespaces/store";
export { EndpointSliceStore } from "../../renderer/components/network-endpoint-slices/store";
export {
  EndpointsStore,
  EndpointsStore as EndpointStore,
} from "../../renderer/components/network-endpoints/store";
export { IngressClassStore } from "../../renderer/components/network-ingresses/ingress-class-store";
export { IngressStore } from "../../renderer/components/network-ingresses/ingress-store";
export { NetworkPolicyStore } from "../../renderer/components/network-policies/store";
export { ServiceStore } from "../../renderer/components/network-services/store";
export { NodeStore, NodeStore as NodesStore } from "../../renderer/components/nodes/store";
export { StorageClassStore } from "../../renderer/components/storage-classes/store";
export {
  PersistentVolumeClaimStore,
  PersistentVolumeClaimStore as VolumeClaimStore,
} from "../../renderer/components/storage-volume-claims/store";
export {
  PersistentVolumeStore,
  PersistentVolumeStore as PersistentVolumesStore,
} from "../../renderer/components/storage-volumes/store";
export { ClusterRoleBindingStore } from "../../renderer/components/user-management/cluster-role-bindings/store";
export { ClusterRoleStore } from "../../renderer/components/user-management/cluster-roles/store";
export {
  RoleBindingStore,
  RoleBindingStore as RoleBindingsStore,
} from "../../renderer/components/user-management/role-bindings/store";
export { RoleStore, RoleStore as RolesStore } from "../../renderer/components/user-management/roles/store";
export {
  ServiceAccountStore,
  ServiceAccountStore as ServiceAccountsStore,
} from "../../renderer/components/user-management/service-accounts/store";
export { CronJobStore } from "../../renderer/components/workloads-cronjobs/store";
export { DaemonSetStore } from "../../renderer/components/workloads-daemonsets/store";
export { DeploymentStore } from "../../renderer/components/workloads-deployments/store";
export { JobStore } from "../../renderer/components/workloads-jobs/store";
export { PodStore, PodStore as PodsStore } from "../../renderer/components/workloads-pods/store";
export { ReplicaSetStore } from "../../renderer/components/workloads-replicasets/store";
export { StatefulSetStore } from "../../renderer/components/workloads-statefulsets/store";

export type {
  MetricData,
  MetricResult,
} from "../../common/k8s-api/endpoints/metrics.api";
export type {
  RequestMetrics,
  RequestMetricsParams,
} from "../../common/k8s-api/endpoints/metrics.api/request-metrics.injectable";
