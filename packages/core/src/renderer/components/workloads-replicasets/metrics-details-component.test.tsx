/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import React from "react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { renderFor } from "../test-utils/renderFor";
import replicaSetMetricsInjectable from "./metrics.injectable";
import { ReplicaSetMetricsDetailsComponent } from "./metrics-details-component";

import type { ReplicaSet } from "@freelensapp/kube-object";

jest.mock("../cluster/metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

jest.mock("../resource-metrics", () => ({
  ResourceMetrics: () => null,
}));

describe("ReplicaSetMetricsDetailsComponent", () => {
  it("renders the time-range selector and keys custom ranges by boundaries", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let capturedParams: unknown;
    const replicaSet = {
      getId: () => "replica-set-id",
      getName: () => "replica-set-name",
      getNs: () => "replica-set-ns",
    } as unknown as ReplicaSet;

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => ({ duration: null, customStart: 555, customEnd: 666 }),
          },
          displayLabel: {
            get: () => "custom-range",
          },
        }) as never,
    );
    di.override(replicaSetMetricsInjectable, (_di, params) => {
      capturedParams = params;

      return {} as never;
    });

    render(<ReplicaSetMetricsDetailsComponent object={replicaSet} />);

    expect(screen.getByTestId("metrics-time-range-selector")).toBeInTheDocument();
    expect(capturedParams).toEqual(
      expect.objectContaining({
        timeRangeKey: "custom-555-666",
      }),
    );
  });
});
