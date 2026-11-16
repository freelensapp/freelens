/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { computed } from "mobx";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import { renderFor } from "../test-utils/renderFor";
import { WorkloadStatusCards } from "./workload-status-cards";

import type { DiRender } from "../test-utils/renderFor";
import type { WorkloadStatus } from "./overview-workload-status";
import type { Workload } from "./workloads/workload-injection-token";

const workload = (title: string, apiName: string, amount: number, status: WorkloadStatus): Workload => ({
  resource: { apiName, group: "" },
  open: vi.fn(),
  amountOfItems: computed(() => amount),
  status: computed(() => status),
  title,
  orderNumber: 0,
});

describe("WorkloadStatusCards", () => {
  let render: DiRender;

  beforeEach(() => {
    render = renderFor(getDiForUnitTesting());
  });

  it("shows one card per kind", () => {
    render(
      <WorkloadStatusCards
        namespaceScope="one"
        workloads={[workload("Pods", "pods", 3, { running: 3 }), workload("Deployments", "deployments", 0, {})]}
      />,
    );

    expect(screen.getByTestId("workload-status-card-pods")).toBeInTheDocument();
    expect(screen.getByTestId("workload-status-card-deployments")).toBeInTheDocument();
  });

  it("states the total, the share that is healthy and the number that fail", () => {
    render(
      <WorkloadStatusCards
        namespaceScope="one"
        workloads={[workload("Pods", "pods", 10, { Running: 6, Succeeded: 1, Pending: 1, Failed: 1, Evicted: 1 })]}
      />,
    );

    const card = screen.getByTestId("workload-status-card-pods");

    expect(screen.getByTestId("workload-status-card-pods-total")).toHaveTextContent("10");
    expect(within(card).getByText("70% healthy")).toBeInTheDocument();
    expect(screen.getByTestId("workload-status-card-pods-failing")).toHaveTextContent("2 failing");
  });

  it("lists the statuses from healthy to failing with their counts and shares", () => {
    render(
      <WorkloadStatusCards
        namespaceScope="one"
        workloads={[workload("Pods", "pods", 10, { Failed: 1, Pending: 1, Running: 6, Evicted: 1, Succeeded: 1 })]}
      />,
    );

    const rows = within(screen.getByTestId("workload-status-card-pods"))
      .getAllByTestId(/^workload-status-card-pods-status-/)
      .map((row) => row.textContent);

    expect(rows).toEqual(["Running660%", "Succeeded110%", "Pending110%", "Failed110%", "Evicted110%"]);
  });

  it("marks only the failing statuses as failing", () => {
    render(
      <WorkloadStatusCards namespaceScope="one" workloads={[workload("Pods", "pods", 2, { running: 1, failed: 1 })]} />,
    );

    expect(screen.getByTestId("workload-status-card-pods-status-failed")).toHaveAttribute("data-failing", "true");
    expect(screen.getByTestId("workload-status-card-pods-status-running")).not.toHaveAttribute("data-failing");
  });

  it("colors every status with the status color of the theme", () => {
    render(
      <WorkloadStatusCards namespaceScope="one" workloads={[workload("Pods", "pods", 2, { running: 1, failed: 1 })]} />,
    );

    const dot = (status: string) =>
      screen.getByTestId(`workload-status-card-pods-status-${status}`).querySelector("[aria-hidden]");

    expect(dot("running")?.getAttribute("style")).toBe("background-color: var(--colorOk);");
    expect(dot("failed")?.getAttribute("style")).toBe("background-color: var(--colorError);");
  });

  it("does not report failures when nothing fails", () => {
    render(<WorkloadStatusCards namespaceScope="one" workloads={[workload("Pods", "pods", 2, { running: 2 })]} />);

    expect(screen.queryByTestId("workload-status-card-pods-failing")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("workload-status-card-pods")).getByText("100% healthy")).toBeInTheDocument();
  });

  it("says when there is none of a kind in the namespace", () => {
    render(<WorkloadStatusCards namespaceScope="one" workloads={[workload("Jobs", "jobs", 0, {})]} />);

    expect(screen.getByTestId("workload-status-card-jobs-total")).toHaveTextContent("0");
    expect(screen.getByTestId("workload-status-card-jobs-empty")).toHaveTextContent("None in this namespace");
    expect(within(screen.getByTestId("workload-status-card-jobs")).queryByText(/healthy/)).not.toBeInTheDocument();
  });

  it.each([
    { namespaceScope: "all" as const, text: "None in any namespace" },
    { namespaceScope: "several" as const, text: "None in these namespaces" },
  ])("says $text with $namespaceScope namespaces", ({ namespaceScope, text }) => {
    render(<WorkloadStatusCards namespaceScope={namespaceScope} workloads={[workload("Jobs", "jobs", 0, {})]} />);

    expect(screen.getByTestId("workload-status-card-jobs-empty")).toHaveTextContent(text);
  });

  it("says when the items of a kind report no status", () => {
    render(
      <WorkloadStatusCards
        namespaceScope="one"
        workloads={[workload("Replica Sets", "replicasets", 2, { running: 0 })]}
      />,
    );

    expect(screen.getByTestId("workload-status-card-replica-sets-empty")).toHaveTextContent("No status reported");
  });

  it("opens the list of the kind when the card is clicked", async () => {
    const pods = workload("Pods", "pods", 1, { running: 1 });

    render(<WorkloadStatusCards namespaceScope="one" workloads={[pods]} />);
    await userEvent.click(screen.getByTestId("workload-status-card-pods"));

    expect(pods.open).toHaveBeenCalledTimes(1);
  });

  it("opens the list of the kind from the keyboard", async () => {
    const user = userEvent.setup();
    const pods = workload("Pods", "pods", 1, { running: 1 });
    const jobs = workload("Jobs", "jobs", 1, { succeeded: 1 });

    render(<WorkloadStatusCards namespaceScope="one" workloads={[pods, jobs]} />);

    expect(screen.getByRole("button", { name: /^Jobs/ })).toBe(screen.getByTestId("workload-status-card-jobs"));

    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(jobs.open).toHaveBeenCalledTimes(1);
    expect(pods.open).not.toHaveBeenCalled();

    await user.keyboard(" ");

    expect(jobs.open).toHaveBeenCalledTimes(2);
  });
});
