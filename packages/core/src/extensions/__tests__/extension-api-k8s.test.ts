// import { ClusterRoleApi, ClusterRoleBindingApi, ConfigMapApi } from "@freelensapp/kube-api";
// import {
//   clusterRoleApiInjectable,
//   clusterRoleBindingApiInjectable,
//   configMapApiInjectable,
// } from "@freelensapp/kube-api-specifics";
// import configMapStoreInjectable from "../../renderer/components/config-maps/store.injectable";
// import clusterRoleBindingStoreInjectable from "../../renderer/components/user-management/cluster-role-bindings/store.injectable";
// import clusterRoleStoreInjectable from "../../renderer/components/user-management/cluster-roles/store.injectable";

import {
  clusterRoleApiInjectable,
  clusterRoleBindingApiInjectable,
  configMapApiInjectable,
  cronJobApiInjectable,
  customResourceDefinitionApiInjectable,
  daemonSetApiInjectable,
  deploymentApiInjectable,
  endpointSliceApiInjectable,
  endpointsApiInjectable,
  horizontalPodAutoscalerApiInjectable,
  ingressApiInjectable,
  jobApiInjectable,
  kubeEventApiInjectable,
  limitRangeApiInjectable,
  namespaceApiInjectable,
  networkPolicyApiInjectable,
  nodeApiInjectable,
  nodeMetricsApiInjectable,
  persistentVolumeApiInjectable,
  persistentVolumeClaimApiInjectable,
  podApiInjectable,
  podDisruptionBudgetApiInjectable,
  podMetricsApiInjectable,
  priorityClassApiInjectable,
  replicaSetApiInjectable,
  resourceQuotaApiInjectable,
  roleApiInjectable,
  roleBindingApiInjectable,
  secretApiInjectable,
  serviceAccountApiInjectable,
  serviceApiInjectable,
  statefulSetApiInjectable,
  storageClassApiInjectable,
  verticalPodAutoscalerApiInjectable,
} from "@freelensapp/kube-api-specifics";
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
import { getDiForUnitTesting } from "../../renderer/getDiForUnitTesting";
import * as extensions from "../extension-api";

class KubeApi {}
class KubeObjectStore {}

describe("Extensions API", () => {
  describe("K8sApi namespace", () => {
    // let extensions: any;

    beforeEach(async () => {
      const di = getDiForUnitTesting();
      di.override(configMapApiInjectable, (() => new KubeApi()) as any);
      di.override(configMapStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(clusterRoleApiInjectable, (() => new KubeApi()) as any);
      di.override(clusterRoleBindingApiInjectable, (() => new KubeApi()) as any);
      di.override(clusterRoleStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(clusterRoleBindingStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(cronJobApiInjectable, (() => new KubeApi()) as any);
      di.override(cronJobStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(customResourceDefinitionApiInjectable, (() => new KubeApi()) as any);
      di.override(customResourceDefinitionStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(daemonSetApiInjectable, (() => new KubeApi()) as any);
      di.override(daemonSetStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(deploymentApiInjectable, (() => new KubeApi()) as any);
      di.override(deploymentStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(endpointsApiInjectable, (() => new KubeApi()) as any);
      di.override(endpointsStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(endpointSliceApiInjectable, (() => new KubeApi()) as any);
      di.override(endpointSliceStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(kubeEventApiInjectable, (() => new KubeApi()) as any);
      di.override(eventStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(horizontalPodAutoscalerApiInjectable, (() => new KubeApi()) as any);
      di.override(horizontalPodAutoscalerStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(ingressApiInjectable, (() => new KubeApi()) as any);
      di.override(ingressStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(jobApiInjectable, (() => new KubeApi()) as any);
      di.override(jobStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(limitRangeApiInjectable, (() => new KubeApi()) as any);
      di.override(limitRangeStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(namespaceApiInjectable, (() => new KubeApi()) as any);
      di.override(namespaceStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(networkPolicyApiInjectable, (() => new KubeApi()) as any);
      di.override(networkPolicyStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(nodeApiInjectable, (() => new KubeApi()) as any);
      di.override(nodeStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(nodeMetricsApiInjectable, (() => new KubeApi()) as any);
      di.override(persistentVolumeApiInjectable, (() => new KubeApi()) as any);
      di.override(persistentVolumeStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(persistentVolumeClaimApiInjectable, (() => new KubeApi()) as any);
      di.override(persistentVolumeClaimStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(podApiInjectable, (() => new KubeApi()) as any);
      di.override(podStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(podDisruptionBudgetApiInjectable, (() => new KubeApi()) as any);
      di.override(podDisruptionBudgetStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(podMetricsApiInjectable, (() => new KubeApi()) as any);
      di.override(priorityClassApiInjectable, (() => new KubeApi()) as any);
      di.override(priorityClassStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(replicaSetApiInjectable, (() => new KubeApi()) as any);
      di.override(replicaSetStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(resourceQuotaApiInjectable, (() => new KubeApi()) as any);
      di.override(resourceQuotaStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(roleApiInjectable, (() => new KubeApi()) as any);
      di.override(roleStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(roleBindingApiInjectable, (() => new KubeApi()) as any);
      di.override(roleBindingStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(secretApiInjectable, (() => new KubeApi()) as any);
      di.override(secretStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(serviceApiInjectable, (() => new KubeApi()) as any);
      di.override(serviceStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(serviceAccountApiInjectable, (() => new KubeApi()) as any);
      di.override(serviceAccountStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(statefulSetApiInjectable, (() => new KubeApi()) as any);
      di.override(statefulSetStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(storageClassApiInjectable, (() => new KubeApi()) as any);
      di.override(storageClassStoreInjectable, (() => new KubeObjectStore()) as any);
      di.override(verticalPodAutoscalerApiInjectable, (() => new KubeApi()) as any);
      di.override(verticalPodAutoscalerStoreInjectable, (() => new KubeObjectStore()) as any);
    });

    it("should export isAllowedResource and API objects", () => {
      expect(extensions.Renderer.K8sApi).toHaveProperty("isAllowedResource");
      expect(typeof extensions.Renderer.K8sApi.isAllowedResource).toBe("function");
      expect(extensions.Renderer.K8sApi).toHaveProperty("apiManager");
      expect(extensions.Renderer.K8sApi).toHaveProperty("createResourceStack");
      expect(extensions.Renderer.K8sApi).toHaveProperty("forCluster");
      expect(extensions.Renderer.K8sApi).toHaveProperty("forRemoteCluster");
      expect(extensions.Renderer.K8sApi).toHaveProperty("getPodsByOwnerId");
      expect(extensions.Renderer.K8sApi).toHaveProperty("requestMetrics");
    });

    it("should export stores and apis for Kubernetes resources", () => {
      expect(extensions.Renderer.K8sApi).toHaveProperty("clusterRoleBindingStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("clusterRoleStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("configMapStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("crdStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("cronJobStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("daemonSetStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("deploymentStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("endpointSliceStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("endpointStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("eventStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("hpaStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("ingressStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("jobStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("limitRangeStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("namespaceStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("networkPolicyStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("nodesStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("pcStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("pdbStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("persistentVolumeStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("podsStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("pvcStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("replicaSetStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("resourceQuotaStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("roleBindingStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("roleStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("secretsStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("serviceAccountsStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("serviceStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("statefulSetStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("storageClassStore");
      expect(extensions.Renderer.K8sApi).toHaveProperty("vpaStore");
    });

    it("should export Kubernetes API objects", () => {
      expect(extensions.Renderer.K8sApi).toHaveProperty("clusterRoleApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("clusterRoleBindingApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("configMapApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("crdApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("cronJobApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("daemonSetApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("deploymentApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("endpointApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("endpointSliceApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("eventApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("hpaApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("ingressApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("jobApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("limitRangeApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("namespacesApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("networkPolicyApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("nodesApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("nodesMetricsApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("pcApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("pdbApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("persistentVolumeApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("podsApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("podsMetricsApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("priorityClassApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("pvcApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("replicaSetApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("resourceQuotaApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("roleApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("roleBindingApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("secretsApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("serviceAccountsApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("serviceApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("statefulSetApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("storageClassApi");
      expect(extensions.Renderer.K8sApi).toHaveProperty("vpaApi");
    });

    it("should export requestMetrics function", () => {
      expect(extensions.Renderer.K8sApi).toHaveProperty("requestMetrics");
      expect(typeof extensions.Renderer.K8sApi.requestMetrics).toBe("function");
    });
  });
});
