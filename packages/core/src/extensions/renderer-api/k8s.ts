/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalFunctionForExtensionApi } from "@freelensapp/legacy-global-di";
import executeOnClusterInjectable from "../../features/cluster/execute/renderer/execute-on-cluster.injectable";
import { createK8sFunctions } from "../common-api/k8s-functions";
import { getAllClusters } from "./catalog";

export type { ClusterId, KubeApiPatchType, ResourceQuery } from "../../features/cluster/execute/common/types";

const executeOnCluster = asLegacyGlobalFunctionForExtensionApi(executeOnClusterInjectable);

/**
 * K8s API functions for renderer process.
 * Uses IPC to communicate with main process for cluster operations.
 *
 * @example
 * ```typescript
 * import { K8s } from "@freelensapp/core/renderer";
 *
 * // Query pods from a cluster
 * const pods = await K8s.queryCluster<Pod>("my-cluster", {
 *   apiVersion: "v1",
 *   kind: "Pod",
 *   namespace: "default",
 * });
 *
 * // Apply a resource
 * const configMap = await K8s.applyOnCluster("my-cluster", {
 *   apiVersion: "v1",
 *   kind: "ConfigMap",
 *   metadata: { name: "my-config", namespace: "default" },
 *   data: { key: "value" },
 * });
 * ```
 */
const k8sFunctions = createK8sFunctions(executeOnCluster, getAllClusters);

export const {
  queryCluster,
  queryClusters,
  queryAllClusters,
  getResource,
  applyOnCluster,
  deleteOnCluster,
  patchOnCluster,
} = k8sFunctions;
