/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getDiForUnitTesting } from "../../../../main/getDiForUnitTesting";
import customColumnsStorageInjectable from "../custom-columns-storage.injectable";
import type { CustomColumnsStorageState } from "../../common/custom-column-config";

describe("custom-columns-storage", () => {
  it("initializes with empty state", () => {
    const di = getDiForUnitTesting();
    const storage = di.inject(customColumnsStorageInjectable);

    expect(storage.get()).toEqual({});
  });

  it("stores and retrieves custom column configurations", () => {
    const di = getDiForUnitTesting();
    const storage = di.inject(customColumnsStorageInjectable);

    const config: CustomColumnsStorageState = {
      nodes: [
        { path: "metadata.labels.kubernetes.io/os", title: "OS" },
        { path: "status.nodeInfo.kubeletVersion" },
      ],
    };

    storage.set(config);

    expect(storage.get()).toEqual(config);
  });

  it("supports multiple table IDs", () => {
    const di = getDiForUnitTesting();
    const storage = di.inject(customColumnsStorageInjectable);

    const config: CustomColumnsStorageState = {
      nodes: [{ path: "metadata.labels.topology.kubernetes.io/zone" }],
      workloads_pods: [{ path: "status.phase" }],
      workload_deployments: [{ path: "spec.replicas" }],
    };

    storage.set(config);

    const retrieved = storage.get();

    expect(retrieved.nodes).toHaveLength(1);
    expect(retrieved.workloads_pods).toHaveLength(1);
    expect(retrieved.workload_deployments).toHaveLength(1);
  });

  it("handles empty arrays for table IDs", () => {
    const di = getDiForUnitTesting();
    const storage = di.inject(customColumnsStorageInjectable);

    const config: CustomColumnsStorageState = {
      nodes: [],
      workloads_pods: [{ path: "status.phase" }],
    };

    storage.set(config);

    expect(storage.get().nodes).toEqual([]);
    expect(storage.get().workloads_pods).toHaveLength(1);
  });
});
