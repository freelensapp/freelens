/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import createKubeJsonApiForClusterInjectable from "../../common/k8s-api/create-kube-json-api-for-cluster.injectable";
import { getDiForUnitTesting } from "../../main/getDiForUnitTesting";
import { Main } from "../extension-api";

// The renderer counterpart is a file of its own: the extension API resolves its
// container only when a single one is registered, and each environment's
// `getDiForUnitTesting` registers its own.
describe("Main.K8sApi.KubeJsonApi.forCluster", () => {
  it("is callable and returns what the injected function returns", () => {
    const di = getDiForUnitTesting();
    const kubeJsonApi = {};
    const createKubeJsonApiForCluster = vi.fn(() => kubeJsonApi);

    di.override(createKubeJsonApiForClusterInjectable, () => createKubeJsonApiForCluster as any);

    expect(typeof Main.K8sApi.KubeJsonApi.forCluster).toBe("function");
    expect(Main.K8sApi.KubeJsonApi.forCluster("some-cluster-id")).toBe(kubeJsonApi);
    expect(createKubeJsonApiForCluster).toHaveBeenCalledWith("some-cluster-id");
  });
});
