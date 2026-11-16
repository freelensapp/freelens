/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import userPreferenceDescriptorsInjectable from "../../../../../../user-preferences/common/preference-descriptors.injectable";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { OverviewStyle } from "../overview-style";

import type { UserEvent } from "@testing-library/user-event";

import type { PreferenceDescriptors } from "../../../../../../user-preferences/common/preference-descriptors.injectable";
import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

describe("overview style preference", () => {
  let state: UserPreferencesState;
  let descriptors: PreferenceDescriptors;
  let user: UserEvent;

  const radio = (name: string) => screen.getByRole("radio", { name });
  const tile = (value: string) => screen.getByTestId(`overview-style-${value}`);
  const preview = (value: string) => screen.getByTestId(`overview-style-preview-${value}`);

  beforeEach(() => {
    const di = getDiForUnitTesting();

    state = di.inject(userPreferencesStateInjectable);
    descriptors = di.inject(userPreferenceDescriptorsInjectable);
    user = userEvent.setup();
    renderFor(di)(<OverviewStyle />);
  });

  it("is a radio group named Overview style with Cards and Charts", () => {
    const group = screen.getByRole("radiogroup", { name: "Overview style" });

    expect(
      within(group)
        .getAllByRole("radio")
        .map((element) => element.getAttribute("value")),
    ).toEqual(["cards", "charts"]);
  });

  it("names each radio by the label under its preview only", () => {
    expect(radio("Cards")).toBeInTheDocument();
    expect(radio("Charts")).toBeInTheDocument();
  });

  it("selects Cards by default", () => {
    expect(radio("Cards")).toBeChecked();
    expect(radio("Charts")).not.toBeChecked();
    expect(tile("cards")).toHaveClass("selected");
    expect(tile("charts")).not.toHaveClass("selected");
  });

  it("previews the cards with a status card of sample pods", () => {
    const card = preview("cards").querySelector(".StatusCard");

    expect(card).not.toBeNull();
    expect(card).toHaveTextContent("Pods");
    expect(card?.querySelector(".StatusCard-total")).toHaveTextContent("15");
    expect(card?.querySelector(".StatusCard-failing")).toHaveTextContent("1 failing");
    expect([...(card?.querySelectorAll(".StatusCard-label") ?? [])].map((label) => label.textContent)).toEqual([
      "Running",
      "Pending",
      "Failed",
    ]);
  });

  it("previews the charts with the ring chart of the same sample pods", () => {
    expect(preview("charts")).toHaveTextContent("Pods (15)");
    expect(preview("charts").querySelector(".OverviewWorkloadStatus .PieChart")).not.toBeNull();
    expect(preview("charts")).toHaveTextContent("Running: 12");
    expect(preview("charts")).toHaveTextContent("Pending: 2");
    expect(preview("charts")).toHaveTextContent("Failed: 1");
  });

  it("keeps the previews out of the accessibility tree and out of reach", () => {
    for (const value of ["cards", "charts"]) {
      expect(preview(value)).toHaveAttribute("aria-hidden", "true");
      expect(preview(value)).toHaveAttribute("inert");
      expect(within(preview(value)).queryAllByRole("button", { hidden: true })).toEqual([]);
    }
  });

  it("switches both overviews to the charts from a click on the tile", async () => {
    await user.click(preview("charts"));

    expect(state.overviewStyle).toBe("charts");
    expect(radio("Charts")).toBeChecked();
    expect(tile("charts")).toHaveClass("selected");
    expect(tile("cards")).not.toHaveClass("selected");
  });

  it("switches back to the cards from a click on the label", async () => {
    await user.click(screen.getByText("Charts"));
    await user.click(screen.getByText("Cards"));

    expect(state.overviewStyle).toBe("cards");
    expect(radio("Cards")).toBeChecked();
    expect(tile("cards")).toHaveClass("selected");
  });

  it("moves through the styles with the arrow keys", async () => {
    await user.tab();

    expect(radio("Cards")).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    expect(radio("Charts")).toHaveFocus();
    expect(state.overviewStyle).toBe("charts");

    await user.keyboard("{ArrowLeft}");

    expect(radio("Cards")).toHaveFocus();
    expect(state.overviewStyle).toBe("cards");
  });

  it("is a single stop in the tab order", async () => {
    await user.tab();

    expect(radio("Cards")).toHaveFocus();

    await user.tab();

    expect(radio("Charts")).not.toHaveFocus();
  });

  it("follows a change of the preference made elsewhere", async () => {
    state.overviewStyle = "charts";

    expect(await screen.findByRole("radio", { name: "Charts", checked: true })).toBeInTheDocument();
    expect(tile("charts")).toHaveClass("selected");
  });

  it("keeps the description under the previews", () => {
    expect(screen.getByText(/How the cluster and workloads overviews show their numbers/)).toBeInTheDocument();
  });

  it("stores nothing for the default, Cards", () => {
    expect(descriptors.overviewStyle.toStore("cards")).toBeUndefined();
    expect(descriptors.overviewStyle.toStore("charts")).toBe("charts");
  });

  it("reads Cards when nothing or something unknown is stored", () => {
    expect(descriptors.overviewStyle.fromStore(undefined)).toBe("cards");
    expect(descriptors.overviewStyle.fromStore("pies" as never)).toBe("cards");
    expect(descriptors.overviewStyle.fromStore("charts")).toBe("charts");
  });
});
