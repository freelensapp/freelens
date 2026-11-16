/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { CapacityCard } from "../capacity-card";

const headline = () => screen.getByTestId("card").querySelector(".CapacityCard-value");

const legendRow = (label: string) =>
  within(screen.getByTestId("card")).getByText(label, { selector: "dt" }).parentElement;

describe("CapacityCard", () => {
  it("has the public class of the card, and the class it is given", () => {
    render(<CapacityCard title="Disk" usage={1} allocatable={2} className="Custom" data-testid="card" />);

    expect(screen.getByTestId("card")).toHaveClass("CapacityCard", "Custom");
    expect(screen.getByRole("region", { name: "Disk" })).toBe(screen.getByTestId("card"));
  });

  it("shows bare numbers without a unit or a format", () => {
    render(<CapacityCard title="Disk" usage={1.234} allocatable={4} data-testid="card" />);

    expect(headline()).toHaveTextContent("1.23");
    expect(within(screen.getByTestId("card")).getByText("/ 4")).toBeInTheDocument();
    expect(legendRow("Usage")).toHaveTextContent("1.2331%");
  });

  it("appends the unit to the values, but not to the headline", () => {
    render(<CapacityCard title="Disk" usage={20} allocatable={80} unit="volumes" data-testid="card" />);

    const card = screen.getByTestId("card");

    expect(headline()).toHaveTextContent(/^20$/);
    expect(within(card).getByText("/ 80 volumes")).toBeInTheDocument();
    expect(legendRow("Usage")).toHaveTextContent("20 volumes25%");
  });

  it("uses the format for the values and the headline, unless the headline has its own", () => {
    const { rerender } = render(
      <CapacityCard title="Disk" usage={2} allocatable={8} format={(value) => `${value} GB`} data-testid="card" />,
    );

    expect(headline()).toHaveTextContent("2 GB");

    rerender(
      <CapacityCard
        title="Disk"
        usage={2}
        allocatable={8}
        format={(value) => `${value} GB`}
        formatHeadline={(value) => `${value}`}
        data-testid="card"
      />,
    );

    expect(headline()).toHaveTextContent(/^2$/);
  });

  it("names the values with the labels it is given and the defaults for the others", () => {
    render(
      <CapacityCard
        title="Disk"
        usage={2}
        requests={3}
        limits={12}
        allocatable={8}
        capacity={10}
        labels={{ usage: "Used", limits: "Quota" }}
        data-testid="card"
      />,
    );

    expect(legendRow("Used")).toBeInTheDocument();
    expect(legendRow("Requests")).toBeInTheDocument();
    expect(legendRow("Quota")).toHaveAttribute("data-warning", "true");
    expect(legendRow("Allocatable")).toBeInTheDocument();
    expect(legendRow("Capacity")).toBeInTheDocument();
    expect(screen.getByTestId("card-overcommit")).toHaveTextContent("Quota 1.5× Allocatable");
    expect(within(screen.getByTestId("card")).getByRole("img")).toHaveAccessibleName("Disk: Used 2, Allocatable 8");
  });

  it("gives every part a class that starts with the name of the card", () => {
    // Generic classes such as `.header` or `.title` would pick up the styles of the page the card is on.
    const { container } = render(
      <CapacityCard title="Disk" usage={3} requests={2} limits={6} allocatable={4} capacity={5} />,
    );
    const parts = Array.from(container.querySelectorAll(".CapacityCard *"));

    expect(parts.length).toBeGreaterThan(0);
    expect(parts.filter((part) => !part.className.startsWith("CapacityCard-"))).toEqual([]);
  });

  it("has no test ids without one of its own", () => {
    const { container } = render(<CapacityCard title="Disk" usage={1} limits={4} allocatable={2} />);

    expect(container.querySelector("[data-testid]")).toBeNull();
  });
});
