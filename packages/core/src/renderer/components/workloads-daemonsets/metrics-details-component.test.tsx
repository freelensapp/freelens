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
import daemonSetMetricsInjectable from "./metrics.injectable";
import { DaemonSetMetricsDetailsComponent } from "./metrics-details-component";

import type { DaemonSet } from "@freelensapp/kube-object";

jest.mock("../cluster/metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

jest.mock("../resource-metrics", () => ({
  ResourceMetrics: () => null,
}));

describe("DaemonSetMetricsDetailsComponent", () => {
  it("renders the time-range selector and keys custom ranges by boundaries", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let capturedParams: unknown;
    const daemonSet = {
      getId: () => "daemon-set-id",
      getName: () => "daemon-set-name",
      getNs: () => "daemon-set-ns",
    } as unknown as DaemonSet;

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => ({ duration: null, customStart: 999, customEnd: 1111 }),
          },
          displayLabel: {
            get: () => "custom-range",
          },
        }) as never,
    );
    di.override(daemonSetMetricsInjectable, (_di, params) => {
      capturedParams = params;

      return {} as never;
    });

    render(<DaemonSetMetricsDetailsComponent object={daemonSet} />);

    expect(screen.getByTestId("metrics-time-range-selector")).toBeInTheDocument();
    expect(capturedParams).toEqual(
      expect.objectContaining({
        timeRangeKey: "custom-999-1111",
      }),
    );
  });
});
