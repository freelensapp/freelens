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
import deploymentMetricsInjectable from "./metrics.injectable";
import { DeploymentMetricsDetailsComponent } from "./metrics-details-component";

import type { Deployment } from "@freelensapp/kube-object";

jest.mock("../cluster/metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

jest.mock("../resource-metrics", () => ({
  ResourceMetrics: () => null,
}));

describe("DeploymentMetricsDetailsComponent", () => {
  it("renders the time-range selector and keys custom ranges by boundaries", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let capturedParams: unknown;
    const deployment = {
      getId: () => "deployment-id",
      getName: () => "deployment-name",
      getNs: () => "deployment-ns",
    } as unknown as Deployment;

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => ({ duration: null, customStart: 111, customEnd: 222 }),
          },
          displayLabel: {
            get: () => "custom-range",
          },
        }) as never,
    );
    di.override(deploymentMetricsInjectable, (_di, params) => {
      capturedParams = params;

      return {} as never;
    });

    render(<DeploymentMetricsDetailsComponent object={deployment} />);

    expect(screen.getByTestId("metrics-time-range-selector")).toBeInTheDocument();
    expect(capturedParams).toEqual(
      expect.objectContaining({
        timeRangeKey: "custom-111-222",
      }),
    );
  });
});
