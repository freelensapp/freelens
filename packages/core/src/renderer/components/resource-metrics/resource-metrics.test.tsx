/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "@testing-library/jest-dom/vitest";
import { act, screen } from "@testing-library/react";
import { computed, observable } from "mobx";
import { useContext } from "react";
import { renderFor } from "../test-utils/renderFor";
import { ResourceMetrics, ResourceMetricsContext } from "./resource-metrics";

import type { DiContainer } from "@ogre-tools/injectable";

import type { MetricData } from "../../../common/k8s-api/endpoints/metrics.api";

const object = {
  getId: () => "resource-id",
  getName: () => "resource-name",
} as never;

function metricWithValue(value: string): MetricData {
  return {
    status: "success",
    data: {
      resultType: "matrix",
      result: [
        {
          metric: {},
          values: [[1, value]],
        },
      ],
    },
  };
}

function MetricsProbe() {
  const context = useContext(ResourceMetricsContext);

  if (!context?.metrics) {
    return null;
  }

  return <div data-testid="metrics-value">{context.metrics.cpuUsage?.data.result[0].values[0]?.[1]}</div>;
}

function renderResourceMetrics(di: DiContainer) {
  const render = renderFor(di);
  const pending = observable.box(false);
  const metricsValue = observable.box<Partial<Record<"cpuUsage", MetricData>> | undefined>({
    cpuUsage: metricWithValue("1"),
  });
  const metricsKey = observable.box("custom-100-200");
  const metrics = {
    pending: computed(() => pending.get()),
    value: computed(() => metricsValue.get()),
  } as never;
  const result = render(
    <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey={metricsKey.get()}>
      <MetricsProbe />
    </ResourceMetrics>,
  );

  return {
    ...result,
    pending,
    metricsValue,
    metricsKey,
  };
}

describe("ResourceMetrics", () => {
  it("renders resolved metrics", () => {
    const { container } = renderResourceMetrics({} as never);

    expect(screen.getByTestId("metrics-value")).toHaveTextContent("1");
    expect(container.querySelector(".graph")).not.toBeEmptyDOMElement();
  });

  it("hides stale metrics when a different metrics key is pending", () => {
    const render = renderFor({} as never);
    const pending = observable.box(false);
    const metricsValue = observable.box<Partial<Record<"cpuUsage", MetricData>> | undefined>({
      cpuUsage: metricWithValue("1"),
    });
    const metricsKey = observable.box("custom-100-200");
    const metrics = {
      pending: computed(() => pending.get()),
      value: computed(() => metricsValue.get()),
    } as never;
    const result = render(
      <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey={metricsKey.get()}>
        <MetricsProbe />
      </ResourceMetrics>,
    );

    expect(screen.getByTestId("metrics-value")).toHaveTextContent("1");

    act(() => {
      pending.set(true);
      metricsKey.set("custom-300-400");
    });

    result.rerender(
      <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey={metricsKey.get()}>
        <MetricsProbe />
      </ResourceMetrics>,
    );

    expect(screen.queryByTestId("metrics-value")).not.toBeInTheDocument();
    expect(result.container.querySelector(".graph")).toBeEmptyDOMElement();
  });

  it("renders the new metrics after the pending key resolves", () => {
    const render = renderFor({} as never);
    const pending = observable.box(false);
    const metricsValue = observable.box<Partial<Record<"cpuUsage", MetricData>> | undefined>({
      cpuUsage: metricWithValue("1"),
    });
    const metricsKey = observable.box("custom-100-200");
    const metrics = {
      pending: computed(() => pending.get()),
      value: computed(() => metricsValue.get()),
    } as never;
    const result = render(
      <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey={metricsKey.get()}>
        <MetricsProbe />
      </ResourceMetrics>,
    );

    act(() => {
      pending.set(true);
      metricsKey.set("custom-300-400");
    });

    result.rerender(
      <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey={metricsKey.get()}>
        <MetricsProbe />
      </ResourceMetrics>,
    );

    act(() => {
      metricsValue.set({
        cpuUsage: metricWithValue("2"),
      });
      pending.set(false);
    });

    result.rerender(
      <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey={metricsKey.get()}>
        <MetricsProbe />
      </ResourceMetrics>,
    );

    expect(screen.getByTestId("metrics-value")).toHaveTextContent("2");
  });

  it("hides stale metrics on first mount when a reused async value is still pending", () => {
    const render = renderFor({} as never);
    const metrics = {
      pending: computed(() => true),
      value: computed(
        () =>
          ({
            cpuUsage: metricWithValue("1"),
          }) as Partial<Record<"cpuUsage", MetricData>>,
      ),
    } as never;

    const result = render(
      <ResourceMetrics object={object} tabs={["CPU"]} metrics={metrics} metricsKey="custom-300-400">
        <MetricsProbe />
      </ResourceMetrics>,
    );

    expect(screen.queryByTestId("metrics-value")).not.toBeInTheDocument();
    expect(result.container.querySelector(".graph")).toBeEmptyDOMElement();
  });
});
