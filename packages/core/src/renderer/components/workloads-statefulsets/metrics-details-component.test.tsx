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
import statefulSetMetricsInjectable from "./metrics.injectable";
import { StatefulSetMetricsDetailsComponent } from "./metrics-details-component";

import type { StatefulSet } from "@freelensapp/kube-object";

jest.mock("../cluster/metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

jest.mock("../resource-metrics", () => ({
  ResourceMetrics: () => null,
}));

describe("StatefulSetMetricsDetailsComponent", () => {
  it("renders the time-range selector and keys custom ranges by boundaries", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let capturedParams: unknown;
    const statefulSet = {
      getId: () => "stateful-set-id",
      getName: () => "stateful-set-name",
      getNs: () => "stateful-set-ns",
    } as unknown as StatefulSet;

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => ({ duration: null, customStart: 333, customEnd: 444 }),
          },
          displayLabel: {
            get: () => "custom-range",
          },
        }) as never,
    );
    di.override(statefulSetMetricsInjectable, (_di, params) => {
      capturedParams = params;

      return {} as never;
    });

    render(<StatefulSetMetricsDetailsComponent object={statefulSet} />);

    expect(screen.getByTestId("metrics-time-range-selector")).toBeInTheDocument();
    expect(capturedParams).toEqual(
      expect.objectContaining({
        timeRangeKey: "custom-333-444",
      }),
    );
  });
});
