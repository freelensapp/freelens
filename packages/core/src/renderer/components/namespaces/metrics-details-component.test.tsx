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
import namespaceMetricsInjectable from "./metrics.injectable";
import { NamespaceMetricsDetailsComponent } from "./metrics-details-component";

import type { Namespace } from "@freelensapp/kube-object";

jest.mock("../cluster/metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

jest.mock("../resource-metrics", () => ({
  ResourceMetrics: () => null,
}));

describe("NamespaceMetricsDetailsComponent", () => {
  it("renders the time-range selector and keys custom ranges by boundaries", () => {
    const di = getDiForUnitTesting();
    const render = renderFor(di);
    let capturedParams: unknown;
    const namespace = {
      getId: () => "namespace-id",
      getName: () => "namespace-name",
      getNs: () => "namespace-name",
    } as unknown as Namespace;

    di.override(
      selectedMetricsTimeRangeInjectable,
      () =>
        ({
          value: {
            get: () => ({ duration: null, customStart: 1234, customEnd: 1567 }),
          },
          displayLabel: {
            get: () => "custom-range",
          },
        }) as never,
    );
    di.override(namespaceMetricsInjectable, (_di, params) => {
      capturedParams = params;

      return {} as never;
    });

    render(<NamespaceMetricsDetailsComponent object={namespace} />);

    expect(screen.getByTestId("metrics-time-range-selector")).toBeInTheDocument();
    expect(capturedParams).toEqual(
      expect.objectContaining({
        timeRangeKey: "custom-1234-1567",
      }),
    );
  });
});
