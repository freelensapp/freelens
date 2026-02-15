/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

/**
 * Represents a single user-configured custom column for a specific resource table.
 */
export interface CustomColumnConfig {
  /**
   * Dot-notation field path into the resource object (e.g., `metadata.labels.app`, `status.phase`).
   * Serves as the unique identifier within a table.
   */
  path: string;

  /**
   * User-provided display title. Defaults to `path` if not provided.
   */
  title?: string;
}

/**
 * The top-level storage structure, keyed by `tableId`.
 * Storage key: "custom_table_columns"
 * Storage location: {directoryForUserData}/lens-local-storage/{hostedClusterId}.json
 * Scope: Per-cluster (automatic via createStorage + hostedClusterId)
 */
export interface CustomColumnsStorageState {
  /**
   * Array of custom column configs for a given table.
   * tableId matches the existing table identifiers (e.g., "nodes", "workloads_pods", "workload_deployments").
   */
  [tableId: string]: CustomColumnConfig[];
}
