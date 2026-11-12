/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { computed } from "mobx";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { ClusterMetricSwitchers } from "./cluster-metric-switchers";
import selectedMetricsTypeInjectable from "./overview/selected-metrics-type.injectable";
import selectedNodeRoleForMetricsInjectable from "./overview/selected-node-role-for-metrics.injectable";

vi.mock("./metrics-time-range-selector", () => ({
  MetricsTimeRangeSelector: () => <div data-testid="metrics-time-range-selector" />,
}));

function renderSwitchers({ hasMasterNodes = true, hasWorkerNodes = true } = {}) {
  const di = getDiForUnitTesting();
  const render = renderFor(di);

  di.override(selectedMetricsTypeInjectable, () => ({
    value: computed(() => "cpu" as const),
    set: vi.fn(),
  }));
  di.override(selectedNodeRoleForMetricsInjectable, () => ({
    value: computed(() => "worker" as const),
    set: vi.fn(),
    nodes: computed(() => [] as never),
    hasMasterNodes: computed(() => hasMasterNodes),
    hasWorkerNodes: computed(() => hasWorkerNodes),
  }));

  return render(<ClusterMetricSwitchers hasCPUMetrics={true} hasMemoryMetrics={true} />);
}

describe("ClusterMetricSwitchers", () => {
  it("renders Control plane, Worker, CPU and Memory options and no Master label", () => {
    renderSwitchers();

    expect(screen.getByRole("radio", { name: "Control plane" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Worker" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CPU" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Memory" })).toBeInTheDocument();
    expect(screen.queryByText("Master")).not.toBeInTheDocument();
  });

  it("disables Control plane when there are no control plane nodes", () => {
    renderSwitchers({ hasMasterNodes: false });

    const radio = screen.getByRole("radio", { name: "Control plane" });

    expect(radio).toBeDisabled();
    expect(radio.closest("label")).toHaveClass("disabled");
  });

  it("enables Control plane when there are control plane nodes", () => {
    renderSwitchers({ hasMasterNodes: true });

    const radio = screen.getByRole("radio", { name: "Control plane" });

    expect(radio).toBeEnabled();
    expect(radio.closest("label")).not.toHaveClass("disabled");
  });

  it("disables Worker when there are no worker nodes", () => {
    renderSwitchers({ hasWorkerNodes: false });

    const radio = screen.getByRole("radio", { name: "Worker" });

    expect(radio).toBeDisabled();
    expect(radio.closest("label")).toHaveClass("disabled");
  });
});
