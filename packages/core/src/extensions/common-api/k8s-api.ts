/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// NOTE: this file is not currently exported as part of `Common`, but should be.
//       It is here to consolidate the common parts which are exported to `Main`
//       and to `Renderer`

import {
  DeploymentApi as InternalDeploymentApi,
  IngressApi as InternalIngressApi,
  KubeApi as InternalKubeApi,
  NodeApi,
  PersistentVolumeClaimApi,
  PodApi,
} from "@freelensapp/kube-api";
import { maybeKubeApiInjectable, storesAndApisCanBeCreatedInjectionToken } from "@freelensapp/kube-api-specifics";
import { KubeJsonApiDataFor, KubeObject, KubeObjectMetadata } from "@freelensapp/kube-object";
import {
  asLegacyGlobalForExtensionApi,
  asLegacyGlobalFunctionForExtensionApi,
  getLegacyGlobalDiForExtensionApi,
} from "@freelensapp/legacy-global-di";
import {
  logErrorInjectionToken,
  loggerInjectionToken,
  logInfoInjectionToken,
  logWarningInjectionToken,
} from "@freelensapp/logger";
import createResourceStackInjectable from "../../common/k8s/create-resource-stack.injectable";
import apiManagerInjectable from "../../common/k8s-api/api-manager/manager.injectable";
import createKubeApiForClusterInjectable from "../../common/k8s-api/create-kube-api-for-cluster.injectable";
import createKubeApiForRemoteClusterInjectable from "../../common/k8s-api/create-kube-api-for-remote-cluster.injectable";
import createKubeJsonApiInjectable from "../../common/k8s-api/create-kube-json-api.injectable";
import createKubeJsonApiForClusterInjectable from "../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import { KubeObjectStore as InternalKubeObjectStore } from "../../common/k8s-api/kube-object.store";
import clusterFrameContextForNamespacedResourcesInjectable from "../../renderer/cluster-frame-context/for-namespaced-resources.injectable";
import getPodsByOwnerIdInjectable from "../../renderer/components/workloads-pods/get-pods-by-owner-id.injectable";

import type { JsonApiConfig } from "@freelensapp/json-api";
import type {
  DerivedKubeApiOptions,
  KubeJsonApi as InternalKubeJsonApi,
  KubeApiDependencies,
  KubeApiOptions,
} from "@freelensapp/kube-api";

import type { NodeFetchRequestInit } from "../../common/fetch/node-fetch.injectable";
import type { ResourceApplyingStack } from "../../common/k8s/resource-stack";
import type { KubeApiDataFrom, KubeObjectStoreOptions } from "../../common/k8s-api/kube-object.store";
import type { ClusterContext } from "../../renderer/cluster-frame-context/cluster-frame-context";
import type { KubernetesCluster } from "./catalog";

export const apiManager = asLegacyGlobalForExtensionApi(apiManagerInjectable);
export const forCluster = asLegacyGlobalFunctionForExtensionApi(createKubeApiForClusterInjectable);
export const forRemoteCluster = asLegacyGlobalFunctionForExtensionApi(createKubeApiForRemoteClusterInjectable);
export const createResourceStack = asLegacyGlobalFunctionForExtensionApi(createResourceStackInjectable);
export const getPodsByOwnerId = asLegacyGlobalFunctionForExtensionApi(getPodsByOwnerIdInjectable);

const getKubeApiDeps = (): KubeApiDependencies => {
  const di = getLegacyGlobalDiForExtensionApi();

  return {
    logError: di.inject(logErrorInjectionToken),
    logInfo: di.inject(logInfoInjectionToken),
    logWarn: di.inject(logWarningInjectionToken),
    maybeKubeApi: di.inject(maybeKubeApiInjectable),
  };
};

export interface ExternalKubeApiOptions {
  /**
   * If `true` then on creation of the `KubeApi`instance a call to `apiManager.registerApi` will be
   * made. This is `true` by default to maintain backwards compatibility.
   *
   * Setting this to `false` might make `KubeObject`'s details drawer stop working.
   *
   * @default true
   */
  autoRegister?: boolean;
}

// NOTE: this is done to preserve `instanceOf` behaviour
function KubeApiCstr<
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>,
>({ autoRegister = true, ...opts }: KubeApiOptions<Object, Data> & ExternalKubeApiOptions) {
  const api = new InternalKubeApi(getKubeApiDeps(), opts);

  const di = getLegacyGlobalDiForExtensionApi();
  const storesAndApisCanBeCreated = di.inject(storesAndApisCanBeCreatedInjectionToken);

  if (storesAndApisCanBeCreated && autoRegister) {
    apiManager.registerApi(api);
  }

  return api;
}

export type KubeApi<
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>,
> = InternalKubeApi<Object, Data>;

export const KubeApi = KubeApiCstr as unknown as new <
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>,
>(
  opts: KubeApiOptions<Object, Data> & ExternalKubeApiOptions,
) => InternalKubeApi<Object, Data>;

/**
 * @deprecated Switch to using `Common.createResourceStack` instead
 */
export class ResourceStack implements ResourceApplyingStack {
  private readonly impl: ResourceApplyingStack;

  constructor(cluster: KubernetesCluster, name: string) {
    this.impl = createResourceStack(cluster, name);
  }

  kubectlApplyFolder(folderPath: string, templateContext?: any, extraArgs?: string[] | undefined): Promise<string> {
    return this.impl.kubectlApplyFolder(folderPath, templateContext, extraArgs);
  }

  kubectlDeleteFolder(folderPath: string, templateContext?: any, extraArgs?: string[] | undefined): Promise<string> {
    return this.impl.kubectlDeleteFolder(folderPath, templateContext, extraArgs);
  }
}

/**
 * @deprecated This type is unused
 */
export interface IKubeApiCluster {
  metadata: {
    uid: string;
  };
}

export {
  createKubeObject,
  isJsonApiData,
  isJsonApiDataList,
  isKubeJsonApiListMetadata,
  isKubeJsonApiMetadata,
  isKubeObjectNonSystem,
  isKubeStatusData,
  isPartialJsonApiData,
  isPartialJsonApiMetadata,
  KubeObject,
  KubeStatus,
  stringifyLabels,
} from "@freelensapp/kube-object";

export type {
  BaseKubeJsonApiObjectMetadata,
  ClusterScopedMetadata,
  KubeJsonApiData,
  KubeJsonApiDataFor,
  KubeJsonApiObjectMetadata,
  KubeObjectMetadata,
  KubeStatusData,
  NamespaceScopedMetadata,
  OwnerReference,
} from "@freelensapp/kube-object";

export type { CreateKubeApiForLocalClusterConfig as ILocalKubeApiConfig } from "../../common/k8s-api/create-kube-api-for-cluster.injectable";
export type { CreateKubeApiForRemoteClusterConfig as IRemoteKubeApiConfig } from "../../common/k8s-api/create-kube-api-for-remote-cluster.injectable";

function KubeJsonApiCstr(config: JsonApiConfig, reqInit?: NodeFetchRequestInit) {
  const di = getLegacyGlobalDiForExtensionApi();
  const createKubeJsonApi = di.inject(createKubeJsonApiInjectable);

  return createKubeJsonApi(config, reqInit);
}

export type KubeJsonApi = InternalKubeJsonApi;

export const KubeJsonApi = Object.assign(
  KubeJsonApiCstr as unknown as new (
    config: JsonApiConfig,
    reqInit?: RequestInit,
  ) => InternalKubeJsonApi,
  {
    forCluster: asLegacyGlobalForExtensionApi(createKubeJsonApiForClusterInjectable),
  },
);

export abstract class KubeObjectStore<
  K extends KubeObject = KubeObject,
  A extends InternalKubeApi<K, D> = InternalKubeApi<K, KubeJsonApiDataFor<K>>,
  D extends KubeJsonApiDataFor<K> = KubeApiDataFrom<K, A>,
> extends InternalKubeObjectStore<K, A, D> {
  /**
   * @deprecated This is no longer used and shouldn't have been every really used
   */
  static readonly context = {
    set: (ctx: ClusterContext) => {
      console.warn("Setting KubeObjectStore.context is no longer supported");
      void ctx;
    },
    get: () => asLegacyGlobalForExtensionApi(clusterFrameContextForNamespacedResourcesInjectable),
  };

  get context() {
    return this.dependencies.context;
  }

  constructor(api: A, opts?: KubeObjectStoreOptions);
  /**
   * @deprecated Supply API instance through constructor
   */
  constructor();
  constructor(api?: A, opts?: KubeObjectStoreOptions) {
    const di = getLegacyGlobalDiForExtensionApi();

    super(
      {
        context: di.inject(clusterFrameContextForNamespacedResourcesInjectable),
        logger: di.inject(loggerInjectionToken),
      },
      api!,
      opts,
    );
  }
}

export type {
  JsonPatch,
  KubeObjectStoreLoadAllParams,
  KubeObjectStoreLoadingParams,
  KubeObjectStoreSubscribeParams,
} from "../../common/k8s-api/kube-object.store";

/**
 * @deprecated This type is only present for backwards compatible typescript support
 */
export interface IgnoredKubeApiOptions {
  /**
   * @deprecated this option is overridden and should not be used
   */
  objectConstructor?: any;
  /**
   * @deprecated this option is overridden and should not be used
   */
  kind?: any;
  /**
   * @deprecated this option is overridden and should not be used
   */
  isNamespaces?: any;
  /**
   * @deprecated this option is overridden and should not be used
   */
  apiBase?: any;
}

// NOTE: these *Constructor functions MUST be `function` to work with `new X()`
function PodsApiConstructor(opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions) {
  return new PodApi(getKubeApiDeps(), opts);
}

export type PodsApi = PodApi;
export const PodsApi = PodsApiConstructor as unknown as new (
  opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions,
) => PodApi;

function NodesApiConstructor(opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions) {
  return new NodeApi(getKubeApiDeps(), opts);
}

export type NodesApi = NodeApi;
export const NodesApi = NodesApiConstructor as unknown as new (
  opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions,
) => NodeApi;

function DeploymentApiConstructor(opts?: DerivedKubeApiOptions) {
  return new InternalDeploymentApi(getKubeApiDeps(), opts);
}

export type DeploymentApi = InternalDeploymentApi;
export const DeploymentApi = DeploymentApiConstructor as unknown as new (
  opts?: DerivedKubeApiOptions,
) => InternalDeploymentApi;

function IngressApiConstructor(opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions) {
  return new InternalIngressApi(getKubeApiDeps(), opts);
}

export type IngressApi = InternalIngressApi;
export const IngressApi = IngressApiConstructor as unknown as new (
  opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions,
) => InternalIngressApi;

function PersistentVolumeClaimsApiConstructor(opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions) {
  return new PersistentVolumeClaimApi(getKubeApiDeps(), opts);
}

export type PersistentVolumeClaimsApi = PersistentVolumeClaimApi;
export const PersistentVolumeClaimsApi = PersistentVolumeClaimsApiConstructor as unknown as new (
  opts?: DerivedKubeApiOptions & IgnoredKubeApiOptions,
) => PersistentVolumeClaimApi;

export {
  ClusterRole,
  ClusterRoleBinding,
  ConfigMap,
  type Container as IPodContainer,
  CronJob,
  CustomResourceDefinition,
  DaemonSet,
  Deployment,
  EndpointSlice,
  Endpoints as Endpoint,
  HorizontalPodAutoscaler,
  Ingress,
  Job,
  KubeEvent,
  LimitRange,
  Namespace,
  NetworkPolicy,
  Node,
  PersistentVolume,
  PersistentVolumeClaim,
  Pod,
  type PodContainerStatus as IPodContainerStatus,
  PodDisruptionBudget,
  PriorityClass,
  ReplicaSet,
  ResourceQuota,
  Role,
  RoleBinding,
  Secret,
  type SecretReference as ISecretRef,
  Service,
  ServiceAccount,
  StatefulSet,
  StorageClass,
} from "@freelensapp/kube-object";

/**
 * The `KubeObject` that can be used in extensions with additional property to
 * get CRD metainfo and the API and Store objects.
 */
export class LensExtensionKubeObject<
  Metadata extends KubeObjectMetadata = KubeObjectMetadata,
  Status = unknown,
  Spec = unknown,
> extends KubeObject<Metadata, Status, Spec> {
  /** Metadata about this CRD object */
  static readonly crd?: LensExtensionKubeObjectCRD;

  /**
   * Returns `KubeApi` object for this kind of resource or throws an error.
   *
   * @example
   *
   * ```ts
   * const api = Example.getApi();
   * const url = api.formatUrlForNotListing({ name: "foo" });
   * ```
   */
  static getApi<Api extends KubeApi>(): Api {
    if (!this.crd) {
      throw new Error(`API for ${this.name} is not for CRD and misses metainfo. Extension won't work correctly.`);
    }
    if (this.kind) {
      for (let apiVersion of this.crd.apiVersions) {
        const api = apiManager.getApiByKind(this.kind, apiVersion);
        if (api) return api as Api;
      }
    }
    throw new Error(`API for ${this.name} is not registered. Extension won't work correctly.`);
  }

  /**
   * Returns `KubeObjectStore` object for this kind of resource or throws and
   * error.
   *
   * @example
   *
   * ```ts
   * const api = Example.getStore();
   * await store.loadAll({ namespaces });
   * ```
   */
  static getStore<Store extends KubeObjectStore<any, any, any>>(): Store {
    const api = this.getApi();
    if (api) {
      const store = apiManager.getStore(api);
      if (store) return store as Store;
    }
    throw new Error(`Store for ${this.name} is not registered. Extension won't work correctly.`);
  }
}

export interface LensExtensionKubeObjectCRD {
  apiVersions: string[];
  plural: string;
  singular: string;
  shortNames?: string[];
}
