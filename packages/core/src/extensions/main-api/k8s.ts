/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { asLegacyGlobalFunctionForExtensionApi } from "@freelensapp/legacy-global-di";
import executeOnClusterHandlerInjectable from "../../features/cluster/execute/main/execute-handler.injectable";
import { createK8sFunctions } from "../common-api/k8s-functions";
import { getAllClusters } from "./catalog";

export type { KubeApiPatchType, ResourceQuery } from "../../features/cluster/execute/common/types";

const executeOnClusterHandler = asLegacyGlobalFunctionForExtensionApi(executeOnClusterHandlerInjectable);

/**
 * K8s API functions for main process.
 * Calls handler directly without IPC for better performance in main process extensions.
 *
 * @example
 * ```typescript
 * import { K8s } from "@freelensapp/core/main";
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
const k8sFunctions = createK8sFunctions(executeOnClusterHandler, getAllClusters);

export const {
  queryCluster,
  queryClusters,
  queryAllClusters,
  getResource,
  execute,
  applyOnCluster,
  deleteOnCluster,
  patchOnCluster,
} = k8sFunctions;
