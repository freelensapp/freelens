/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getDiForUnitTesting } from "../../../getDiForUnitTesting";
import { renderFor } from "../../test-utils/renderFor";
import { StatusCard } from "../status-card";

import type { DiRender } from "../../test-utils/renderFor";
import type { StatusCardStatus } from "../status-card";

const statuses: StatusCardStatus[] = [
  { label: "Ready", count: 6, color: "var(--colorOk)", tone: "healthy" },
  { label: "Progressing", count: 2, color: "var(--colorWarning)" },
  { label: "Stalled", count: 2, color: "var(--colorError)", tone: "failing" },
];

describe("StatusCard", () => {
  let render: DiRender;

  beforeEach(() => {
    // The chevron of a card that opens something is an `Icon`, which needs the container.
    render = renderFor(getDiForUnitTesting());
  });

  it("has the public class of the card, and the class it is given", () => {
    render(<StatusCard title="Releases" statuses={statuses} className="Custom" data-testid="card" />);

    expect(screen.getByTestId("card")).toHaveClass("StatusCard", "Custom");
  });

  it.each([
    { name: "a region", onClick: undefined },
    { name: "a button", onClick: () => {} },
  ])("gives every part of $name a class that starts with the name of the card", ({ onClick }) => {
    // Generic classes such as `.header` or `.title` would pick up the styles of the page the card is on, as
    // `.WorkloadsOverview .header` does. The parts of the chevron's `Icon` are the Icon's own.
    const { container } = render(<StatusCard title="Releases" statuses={statuses} onClick={onClick} />);
    const parts = Array.from(container.querySelectorAll(".StatusCard *")).filter(
      (part) => !part.parentElement?.closest(".Icon"),
    );

    expect(parts.length).toBeGreaterThan(0);
    expect(parts.filter((part) => !Array.from(part.classList).some((name) => name.startsWith("StatusCard-")))).toEqual(
      [],
    );
  });

  it("counts the total from the statuses when it is not given", () => {
    render(<StatusCard title="Releases" statuses={statuses} data-testid="card" />);

    expect(screen.getByTestId("card-total")).toHaveTextContent("10");
    expect(within(screen.getByTestId("card")).getByText("60% healthy")).toBeInTheDocument();
    expect(screen.getByTestId("card-failing")).toHaveTextContent("2 failing");
  });

  it("shows the total it is given", () => {
    render(<StatusCard title="Releases" total={12} statuses={statuses} data-testid="card" />);

    expect(screen.getByTestId("card-total")).toHaveTextContent("12");
  });

  it("lists the statuses in the order given, leaving out those without items", () => {
    render(
      <StatusCard
        title="Releases"
        statuses={[...statuses, { label: "Suspended", count: 0, color: "var(--colorSoftError)" }]}
        data-testid="card"
      />,
    );

    const rows = within(screen.getByTestId("card"))
      .getAllByTestId(/^card-status-/)
      .map((row) => row.textContent);

    expect(rows).toEqual(["Ready660%", "Progressing220%", "Stalled220%"]);
    expect(screen.getByTestId("card-status-stalled")).toHaveAttribute("data-failing", "true");
    expect(screen.getByTestId("card-status-progressing")).not.toHaveAttribute("data-failing");
  });

  it("colors each status with the color it is given", () => {
    render(<StatusCard title="Releases" statuses={statuses} data-testid="card" />);

    expect(screen.getByTestId("card-status-ready").querySelector("[aria-hidden]")?.getAttribute("style")).toBe(
      "background-color: var(--colorOk);",
    );
  });

  it("says the empty text when there are no items", () => {
    const { rerender } = render(<StatusCard title="Releases" statuses={[]} data-testid="card" />);

    expect(screen.getByTestId("card-empty")).toHaveTextContent("None");

    rerender(<StatusCard title="Releases" statuses={[]} emptyText="No releases" data-testid="card" />);

    expect(screen.getByTestId("card-empty")).toHaveTextContent("No releases");
  });

  it("says that no status is reported when the items have none", () => {
    render(<StatusCard title="Releases" total={3} statuses={[]} data-testid="card" />);

    expect(screen.getByTestId("card-empty")).toHaveTextContent("No status reported");
  });

  it("is a region and not a button without onClick", () => {
    render(<StatusCard title="Releases" statuses={statuses} data-testid="card" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Releases" })).toBe(screen.getByTestId("card"));
  });

  it("is a button that calls onClick, from a click and from the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<StatusCard title="Releases" statuses={statuses} onClick={onClick} data-testid="card" />);

    await user.click(screen.getByRole("button", { name: /^Releases/ }));
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
