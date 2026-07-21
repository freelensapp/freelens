/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { fireEvent, screen } from "@testing-library/react";
import navigateToEntitySettingsInjectable from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import hostedClusterInjectable from "../../cluster-frame-context/hosted-cluster.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { NoMetrics } from "./no-metrics";
import { ResourceMetricsContext } from "./resource-metrics";

import type { DiContainer } from "@ogre-tools/injectable";
import type { MockedFunction } from "vitest";

import type { NavigateToEntitySettings } from "../../../common/front-end-routing/routes/entity-settings/navigate-to-entity-settings.injectable";
import type { MetricsErrorInfo } from "../../../common/k8s-api/endpoints/metrics.api";

function renderNoMetrics(di: DiContainer, metricsError?: MetricsErrorInfo) {
  const render = renderFor(di);

  return render(
    <ResourceMetricsContext.Provider
      value={{ object: {} as never, tab: "CPU", metrics: undefined, isPending: false, metricsError }}
    >
      <NoMetrics />
    </ResourceMetricsContext.Provider>,
  );
}

describe("NoMetrics", () => {
  let di: DiContainer;
  let navigateToEntitySettingsMock: MockedFunction<NavigateToEntitySettings>;

  beforeEach(() => {
    di = getDiForUnitTesting();

    navigateToEntitySettingsMock = vi.fn();
    di.override(navigateToEntitySettingsInjectable, () => navigateToEntitySettingsMock);
    di.override(hostedClusterInjectable, () => ({ id: "some-cluster-id" }) as never);
  });

  it("renders the generic message as a single row, unchanged from before error reasons existed", () => {
    renderNoMetrics(di);

    const message = screen.getByTestId("no-metrics-message");

    expect(message).toHaveTextContent("Metrics not available at the moment");
    expect(message).toHaveClass("flex", "justify-center", "items-center");
    expect(message).not.toHaveClass("flex-col");
    expect(message).not.toHaveAttribute("title");
    expect(message.querySelector("p")).not.toBeInTheDocument();
    expect(screen.queryByText("Open cluster settings")).not.toBeInTheDocument();
  });

  it("renders the generic message when rendered outside of a ResourceMetrics context", () => {
    const render = renderFor(di);

    render(<NoMetrics />);

    expect(screen.getByTestId("no-metrics-message")).toHaveTextContent("Metrics not available at the moment");
  });

  it("shows the not-found reason and a working cluster settings link", () => {
    renderNoMetrics(di, { reason: "not-found", message: "No Prometheus service found" });

    expect(screen.getByTestId("no-metrics-message")).toHaveTextContent(
      "No Prometheus service was found for this cluster.",
    );

    const link = screen.getByText("Open cluster settings");

    fireEvent.click(link);

    expect(navigateToEntitySettingsMock).toHaveBeenCalledWith("some-cluster-id", "metrics");
  });

  it("shows the access-denied reason and a cluster settings link", () => {
    renderNoMetrics(di, { reason: "access-denied", message: "Forbidden", status: 403 });

    expect(screen.getByTestId("no-metrics-message")).toHaveTextContent("Access to Prometheus metrics was denied.");
    expect(screen.getByText("Open cluster settings")).toBeInTheDocument();
  });

  it("shows the generic error reason without a link, carrying the detail in the title", () => {
    renderNoMetrics(di, { reason: "error", message: "boom", status: 500 });

    const message = screen.getByTestId("no-metrics-message");

    expect(message).toHaveTextContent("Failed to load metrics.");
    expect(message).toHaveAttribute("title", "HTTP 500: boom");
    expect(screen.queryByText("Open cluster settings")).not.toBeInTheDocument();
  });

  it("does not show a cluster settings link when there is no known cluster id", () => {
    di.override(hostedClusterInjectable, () => undefined);

    renderNoMetrics(di, { reason: "not-found", message: "No Prometheus service found" });

    expect(screen.queryByText("Open cluster settings")).not.toBeInTheDocument();
  });
});
