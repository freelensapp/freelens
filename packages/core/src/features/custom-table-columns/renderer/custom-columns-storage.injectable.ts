/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";

import createStorageInjectable from "../../../renderer/utils/create-storage/create-storage.injectable";
import type { CustomColumnsStorageState } from "../common/custom-column-config";

/**
 * Per-cluster storage for custom table column configurations.
 * 
 * Storage key: "custom_table_columns"
 * Storage location: {directoryForUserData}/lens-local-storage/{hostedClusterId}.json
 * Scope: Per-cluster (automatic via hostedClusterId)
 * 
 * Structure: { [tableId: string]: CustomColumnConfig[] }
 * 
 * Example:
 * {
 *   "nodes": [
 *     { "path": "metadata.labels.topology.kubernetes.io/zone", "title": "Zone" },
 *     { "path": "status.nodeInfo.kubeletVersion" }
 *   ],
 *   "workloads_pods": [
 *     { "path": "status.phase" }
 *   ]
 * }
 */
const customColumnsStorageInjectable = getInjectable({
  id: "custom-columns-storage",

  instantiate: (di) => {
    const createStorage = di.inject(createStorageInjectable);

    return createStorage<CustomColumnsStorageState>("custom_table_columns", {});
  },
});

export default customColumnsStorageInjectable;
