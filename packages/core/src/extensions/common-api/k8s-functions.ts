/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { ClusterConnectionStatus } from "./cluster-types";

import type { KubeJsonApiData } from "@freelensapp/kube-object";

import type {
  ClusterId,
  ExecuteOnClusterRequest,
  ExecuteOnClusterResponse,
  KubeApiPatchType,
  ResourceQuery,
} from "../../features/cluster/execute/common/types";

export type { ClusterId, KubeApiPatchType, ResourceQuery } from "../../features/cluster/execute/common/types";

type ExecuteFn = (request: ExecuteOnClusterRequest) => Promise<ExecuteOnClusterResponse>;
type GetAllClustersFn = () => Array<{ id: ClusterId; status: ClusterConnectionStatus }>;

/**
 * Creates K8s API functions bound to a specific execute function.
 * This factory enables code reuse between renderer (IPC) and main (direct) implementations.
 */
export function createK8sFunctions(executeOnCluster: ExecuteFn, getAllClusters: GetAllClustersFn) {
  /**
   * Query resources from a specific cluster.
   *
   * @param clusterId - Target cluster identifier
   * @param query - Resource query specifying apiVersion, kind, namespace, and optional selectors
   * @returns Array of resources matching the query
   * @throws Error if the cluster is not available or the query fails
   */
  async function queryCluster<T = unknown>(clusterId: ClusterId, query: ResourceQuery): Promise<T[]> {
    const response = await executeOnCluster({
      clusterId,
      operation: "list",
      resource: query,
    });

    if (!response.success) {
      throw new Error(response.error?.message ?? "Query failed");
    }

    const data = response.data as { items?: T[] } | undefined;

    return data?.items ?? [];
  }

  /**
   * Query resources from multiple clusters in parallel.
   *
   * @param clusterIds - Array of cluster identifiers to query
   * @param query - Resource query specifying apiVersion, kind, namespace, and optional selectors
   * @returns Map of cluster IDs to either results array or Error
   */
  async function queryClusters<T = unknown>(
    clusterIds: ClusterId[],
    query: ResourceQuery,
  ): Promise<Map<ClusterId, T[] | Error>> {
    const results = await Promise.allSettled(clusterIds.map((id) => queryCluster<T>(id, query)));

    return new Map(
      clusterIds.map((id, i) => {
        const result = results[i];

        return [
          id,
          result.status === "fulfilled" ? result.value : new Error(result.reason?.message ?? "Unknown error"),
        ];
      }),
    );
  }

  /**
   * Query resources from all connected clusters.
   *
   * @param query - Resource query specifying apiVersion, kind, namespace, and optional selectors
   * @returns Map of cluster IDs to either results array or Error
   */
  async function queryAllClusters<T = unknown>(query: ResourceQuery): Promise<Map<ClusterId, T[] | Error>> {
    const connectedClusters = getAllClusters().filter((c) => c.status === ClusterConnectionStatus.CONNECTED);

    return queryClusters<T>(
      connectedClusters.map((c) => c.id),
      query,
    );
  }

  /**
   * Get a single resource from a cluster.
   *
   * @param clusterId - Target cluster identifier
   * @param query - Resource query with required name field
   * @returns The resource or null if not found
   * @throws Error if the cluster is not available or the query fails (except 404)
   */
  async function getResource<T = unknown>(
    clusterId: ClusterId,
    query: ResourceQuery & { name: string },
  ): Promise<T | null> {
    const response = await executeOnCluster({
      clusterId,
      operation: "get",
      resource: query,
    });

    if (!response.success) {
      if (response.error?.code === 404) {
        return null;
      }

      throw new Error(response.error?.message ?? "Get failed");
    }

    return response.data as T;
  }

  /**
   * Low-level function to execute any operation on a cluster.
   * Prefer using the higher-level functions (queryCluster, getResource, etc.) when possible.
   *
   * @param request - Full execute request with operation, resource, and optional body
   * @returns Raw response from the cluster
   */
  async function execute(request: ExecuteOnClusterRequest): Promise<ExecuteOnClusterResponse> {
    return executeOnCluster(request);
  }

  /**
   * Apply (create or update) a resource on a cluster.
   * If the resource exists, it will be updated; otherwise, it will be created.
   *
   * @param clusterId - Target cluster identifier
   * @param manifest - Full Kubernetes resource manifest with apiVersion, kind, and metadata
   * @returns The created or updated resource
   * @throws Error if the operation fails
   */
  async function applyOnCluster<T extends KubeJsonApiData = KubeJsonApiData>(
    clusterId: ClusterId,
    manifest: T,
  ): Promise<T> {
    const { apiVersion, kind, metadata } = manifest;
    const { name, namespace } = metadata;

    const existing = await getResource<T>(clusterId, {
      apiVersion,
      kind,
      namespace,
      name,
    });

    const operation = existing ? "update" : "create";
    const resource: ResourceQuery = existing ? { apiVersion, kind, namespace, name } : { apiVersion, kind, namespace };

    const response = await executeOnCluster({
      clusterId,
      operation,
      resource,
      body: manifest,
    });

    if (!response.success) {
      throw new Error(response.error?.message ?? `Failed to ${operation} resource`);
    }

    return response.data as T;
  }

  /**
   * Delete a resource from a cluster.
   *
   * @param clusterId - Target cluster identifier
   * @param resource - Resource query with required name field
   * @throws Error if the cluster is not available or deletion fails (except 404)
   */
  async function deleteOnCluster(clusterId: ClusterId, resource: ResourceQuery & { name: string }): Promise<void> {
    const response = await executeOnCluster({
      clusterId,
      operation: "delete",
      resource,
    });

    if (!response.success) {
      if (response.error?.code === 404) {
        return;
      }

      throw new Error(response.error?.message ?? "Delete failed");
    }
  }

  /**
   * Patch a resource on a cluster.
   *
   * @param clusterId - Target cluster identifier
   * @param resource - Resource query with required name field
   * @param patch - Patch data (format depends on patchType)
   * @param patchType - Type of patch: "strategic" (default), "merge", or "json"
   * @returns The patched resource
   * @throws Error if the operation fails
   */
  async function patchOnCluster<T = unknown>(
    clusterId: ClusterId,
    resource: ResourceQuery & { name: string },
    patch: unknown,
    patchType: KubeApiPatchType = "strategic",
  ): Promise<T> {
    const response = await executeOnCluster({
      clusterId,
      operation: "patch",
      resource,
      body: patch,
      patchType,
    });

    if (!response.success) {
      throw new Error(response.error?.message ?? "Patch failed");
    }

    return response.data as T;
  }

  return {
    queryCluster,
    queryClusters,
    queryAllClusters,
    getResource,
    execute,
    applyOnCluster,
    deleteOnCluster,
    patchOnCluster,
  };
}
