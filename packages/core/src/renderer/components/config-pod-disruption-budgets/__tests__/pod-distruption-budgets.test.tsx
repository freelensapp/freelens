/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { maybeKubeApiInjectable } from "@freelensapp/kube-api-specifics";
import { PodDisruptionBudget } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import type { DiContainer } from "@ogre-tools/injectable";
import React from "react";
import { Cluster } from "../../../../common/cluster/cluster";
import selectedNamespacesStorageInjectable from "../../../../features/namespace-filtering/renderer/storage.injectable";
import userPreferencesStateInjectable from "../../../../features/user-preferences/common/state.injectable";
import hostedClusterInjectable from "../../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import siblingTabsInjectable from "../../../routes/sibling-tabs.injectable";
import storesAndApisCanBeCreatedInjectable from "../../../stores-apis-can-be-created.injectable";
import { renderFor } from "../../test-utils/renderFor";
import { PodDisruptionBudgets } from "../pod-disruption-budgets";
import podDisruptionBudgetStoreInjectable from "../store.injectable";

describe("<PodDisruptionBudgets />", () => {
  let di: DiContainer;

  const getPdb = (spec: PodDisruptionBudget["spec"]): PodDisruptionBudget =>
    new PodDisruptionBudget({
      apiVersion: "policy/v1",
      kind: "PodDisruptionBudget",
      metadata: {
        name: "my-pdb",
        resourceVersion: "1",
        selfLink: "/apis/policy/v1/poddistruptionbudgets/my-pdb",
        uid: "1",
        namespace: "default",
      },
      spec,
    });

  const getPodDisruptionBudgetStoreInjectableMock = (pdb: PodDisruptionBudget) =>
    ({
      api: {
        kind: "PodDisruptionBudget",
      },
      getByPath: () => pdb,
      getTotalCount: () => 1,
      contextItems: [pdb],
      pickOnlySelected: (items: any[]) => items,
      isSelectedAll: () => false,
      isSelected: () => true,
    }) as any;

  beforeEach(() => {
    di = getDiForUnitTesting();

    di.override(
      hostedClusterInjectable,
      () =>
        new Cluster({
          contextName: "some-context-name",
          id: "some-cluster-id",
          kubeConfigPath: "/some-path-to-a-kubeconfig",
        }),
    );
    di.override(storesAndApisCanBeCreatedInjectable, () => true);
    di.override(
      selectedNamespacesStorageInjectable,
      () =>
        ({
          get: () => ({}),
        }) as any,
    );
    di.override(loggerInjectionToken, () => null);
    di.override(maybeKubeApiInjectable, () => ({}));
    di.override(siblingTabsInjectable, () => ({ get: () => [] }) as any);
    di.override(userPreferencesStateInjectable, () => ({
      hiddenTableColumns: {
        get: () => ({
          has: () => false,
        }),
      } as any,
    }));
  });

  describe("PDB with minAvailable 0", () => {
    const pdb = getPdb({
      minAvailable: 0,
    });

    it("should display minAvailable as 0", () => {
      di.override(podDisruptionBudgetStoreInjectable, () => getPodDisruptionBudgetStoreInjectableMock(pdb));
      const result = renderFor(di)(<PodDisruptionBudgets object={pdb} />);

      expect(result.container.querySelector(".TableRow .min-available")?.textContent).toEqual("0");
    });

    it("should display maxUnavailable as N/A", () => {
      di.override(podDisruptionBudgetStoreInjectable, () => getPodDisruptionBudgetStoreInjectableMock(pdb));
      const result = renderFor(di)(<PodDisruptionBudgets object={pdb} />);

      expect(result.container.querySelector(".TableRow .max-unavailable")?.textContent).toEqual("N/A");
    });
  });

  describe("PDB with maxUnavailable 0", () => {
    const pdb = getPdb({
      maxUnavailable: 0,
    });

    it("should display minAvailable as N/A", () => {
      di.override(podDisruptionBudgetStoreInjectable, () => getPodDisruptionBudgetStoreInjectableMock(pdb));
      const result = renderFor(di)(<PodDisruptionBudgets object={pdb} />);

      expect(result.container.querySelector(".TableRow .min-available")?.textContent).toEqual("N/A");
    });

    it("should display maxUnavailable as 0", () => {
      di.override(podDisruptionBudgetStoreInjectable, () => getPodDisruptionBudgetStoreInjectableMock(pdb));
      const result = renderFor(di)(<PodDisruptionBudgets object={pdb} />);

      expect(result.container.querySelector(".TableRow .max-unavailable")?.textContent).toEqual("0");
    });
  });
});
