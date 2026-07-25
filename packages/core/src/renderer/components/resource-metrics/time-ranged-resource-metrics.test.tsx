/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import selectedMetricsTimeRangeInjectable from "../cluster/overview/selected-metrics-time-range.injectable";
import { renderFor } from "../test-utils/renderFor";
import { TimeRangedResourceMetrics } from "./time-ranged-resource-metrics";

import type { AtLeastOneMetricTab } from "./resource-metrics";

let capturedResourceMetricsProps: unknown;

vi.mock("../cluster/metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

vi.mock("./resource-metrics", () => ({
  ResourceMetrics: (props: unknown) => {
    capturedResourceMetricsProps = props;

    return <div data-testid="resource-metrics" />;
  },
}));

describe("TimeRangedResourceMetrics", () => {
  it("renders selector with selected label and passes through resource metrics props", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    const object = { getId: () => "obj-id" } as never;
    const tabs = ["CPU", "Memory"] as AtLeastOneMetricTab;
    const metrics = {} as never;

    capturedResourceMetricsProps = undefined;
    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => ({ duration: null, customStart: 101, customEnd: 202 }),
          },
          displayLabel: {
            get: () => "custom-100-200",
          },
        }) as never,
    );

    render(
      <TimeRangedResourceMetrics object={object} tabs={tabs} metrics={metrics}>
        <div data-testid="chart-content" />
      </TimeRangedResourceMetrics>,
    );

    expect(screen.getByTestId("metrics-time-range-selector")).toBeInTheDocument();
    expect(screen.getByTestId("metrics-time-range-selector").closest("[data-time-range]")).toHaveAttribute(
      "data-time-range",
      "custom-100-200",
    );
    expect(capturedResourceMetricsProps).toEqual(
      expect.objectContaining({
        object,
        tabs,
        metrics,
        metricsKey: "custom-101-202",
      }),
    );
  });
});
