/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { ClusterCapacityCards } from "./cluster-capacity-cards";

import type { ClusterLastPoints } from "./cluster-capacity-cards";

const gib = 1024 ** 3;

const fullPoints: ClusterLastPoints = {
  cpuUsage: 0.79,
  cpuRequests: 1.5,
  cpuLimits: 3,
  cpuAllocatableCapacity: 4,
  cpuCapacity: 4,
  memoryUsage: 4 * gib,
  memoryRequests: 2 * gib,
  memoryLimits: 6 * gib,
  memoryAllocatableCapacity: 7.5 * gib,
  memoryCapacity: 8 * gib,
  podUsage: 15,
  podAllocatableCapacity: 110,
  podCapacity: 110,
};

const legendRow = (card: HTMLElement, label: string) => {
  const term = within(card).getByText(label, { selector: "dt" });

  return term.parentElement as HTMLElement;
};

describe("ClusterCapacityCards", () => {
  it("shows a card for CPU, memory and pods", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    expect(screen.getByTestId("capacity-card-cpu")).toBeInTheDocument();
    expect(screen.getByTestId("capacity-card-memory")).toBeInTheDocument();
    expect(screen.getByTestId("capacity-card-pods")).toBeInTheDocument();
  });

  it("states the usage as a number and as a percentage of allocatable", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    const cpu = screen.getByTestId("capacity-card-cpu");

    expect(within(cpu).getByText("0.79")).toBeInTheDocument();
    expect(within(cpu).getByText("/ 4.00 cores")).toBeInTheDocument();
    expect(screen.getByTestId("capacity-card-cpu-percent")).toHaveTextContent("20%");
    expect(screen.getByTestId("capacity-card-pods-percent")).toHaveTextContent("14%");
  });

  it("lists usage, requests, limits and allocatable with their values and percentages", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    const cpu = screen.getByTestId("capacity-card-cpu");

    expect(legendRow(cpu, "Usage")).toHaveTextContent("0.79 cores20%");
    expect(legendRow(cpu, "Requests")).toHaveTextContent("1.50 cores38%");
    expect(legendRow(cpu, "Limits")).toHaveTextContent("3.00 cores75%");
    expect(legendRow(cpu, "Allocatable")).toHaveTextContent("4.00 cores");
  });

  it("names the running pods, without requests or limits", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    const pods = screen.getByTestId("capacity-card-pods");

    expect(legendRow(pods, "Running")).toHaveTextContent("15 pods14%");
    expect(within(pods).queryByText("Requests")).not.toBeInTheDocument();
    expect(within(pods).queryByText("Limits")).not.toBeInTheDocument();
  });

  it("lists the capacity only when it differs from what is allocatable", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    expect(within(screen.getByTestId("capacity-card-cpu")).queryByText("Capacity")).not.toBeInTheDocument();
    expect(legendRow(screen.getByTestId("capacity-card-memory"), "Capacity")).toHaveTextContent("8.0GiB");
  });

  it("describes the bar for assistive technology", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    expect(within(screen.getByTestId("capacity-card-cpu")).getByRole("img")).toHaveAccessibleName(
      "CPU: Usage 0.79 cores, Allocatable 4.00 cores",
    );
  });

  it("does not warn while the limits fit in what is allocatable", () => {
    render(<ClusterCapacityCards lastPoints={fullPoints} />);

    expect(screen.queryByTestId("capacity-card-cpu-overcommit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("capacity-card-cpu-overflow")).not.toBeInTheDocument();
    expect(legendRow(screen.getByTestId("capacity-card-cpu"), "Limits")).not.toHaveAttribute("data-warning");
  });

  it("warns when the limits overcommit what is allocatable", () => {
    render(<ClusterCapacityCards lastPoints={{ ...fullPoints, cpuLimits: 5.6 }} />);

    expect(screen.getByTestId("capacity-card-cpu-overcommit")).toHaveTextContent("Limits 1.4× Allocatable");
    expect(screen.getByTestId("capacity-card-cpu-overflow")).toBeInTheDocument();
    expect(legendRow(screen.getByTestId("capacity-card-cpu"), "Limits")).toHaveAttribute("data-warning", "true");
    expect(screen.queryByTestId("capacity-card-memory-overcommit")).not.toBeInTheDocument();
  });

  it("draws the overcommitted part of the limits beyond the allocatable marker", () => {
    render(<ClusterCapacityCards lastPoints={{ ...fullPoints, cpuLimits: 8 }} />);

    // Limits are the largest value, so the bar is on their scale: allocatable is half of it.
    expect(screen.getByTestId("capacity-card-cpu-overflow")).toHaveStyle({ left: "50%", width: "50%" });
  });

  it("has no card for a resource without metrics", () => {
    render(
      <ClusterCapacityCards
        lastPoints={{
          ...fullPoints,
          memoryUsage: undefined,
          podAllocatableCapacity: undefined,
        }}
      />,
    );

    expect(screen.getByTestId("capacity-card-cpu")).toBeInTheDocument();
    expect(screen.queryByTestId("capacity-card-memory")).not.toBeInTheDocument();
    expect(screen.queryByTestId("capacity-card-pods")).not.toBeInTheDocument();
  });

  it("leaves out requests and limits that have no metrics", () => {
    render(<ClusterCapacityCards lastPoints={{ ...fullPoints, cpuRequests: undefined, cpuLimits: undefined }} />);

    const cpu = screen.getByTestId("capacity-card-cpu");

    expect(within(cpu).queryByText("Requests")).not.toBeInTheDocument();
    expect(within(cpu).queryByText("Limits")).not.toBeInTheDocument();
    expect(legendRow(cpu, "Usage")).toBeInTheDocument();
  });

  it("shows no card at all without metrics", () => {
    render(<ClusterCapacityCards lastPoints={{}} />);

    expect(screen.getByTestId("cluster-capacity-cards")).toBeEmptyDOMElement();
  });
});
