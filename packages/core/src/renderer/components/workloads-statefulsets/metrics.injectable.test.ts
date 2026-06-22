/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import requestPodMetricsForStatefulSetsInjectable from "../../../common/k8s-api/endpoints/metrics.api/request-pod-metrics-for-stateful-sets.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import statefulSetMetricsInjectable from "./metrics.injectable";

import type { StatefulSet } from "@freelensapp/kube-object";

describe("stateful-set-metrics injectable", () => {
  it("requests stateful set pod metrics with the selected time range", () => {
    const di = getDiForUnitTesting();
    const requestPodMetricsForStatefulSets = jest.fn().mockResolvedValue({});
    const statefulSet = {
      getId: () => "stateful-set-id",
      getName: () => "stateful-set-name",
      getNs: () => "stateful-set-ns",
    } as unknown as StatefulSet;

    di.override(requestPodMetricsForStatefulSetsInjectable, () => requestPodMetricsForStatefulSets);
    di.override(selectedMetricsTimeRangeInjectable, () => ({
      timestamps: {
        get: () => ({ start: 2000, end: 2100, range: 100 }),
      },
    }));

    const metrics = di.inject(statefulSetMetricsInjectable, { statefulSet });

    metrics.value.get();

    expect(requestPodMetricsForStatefulSets).toHaveBeenCalledWith([statefulSet], "stateful-set-ns", undefined, {
      start: 2000,
      end: 2100,
      range: 100,
    });
  });
});
