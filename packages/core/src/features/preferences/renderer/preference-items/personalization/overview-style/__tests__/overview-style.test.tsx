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

  it("is a radio group named Overview style with Charts and Cards", () => {
    const group = screen.getByRole("radiogroup", { name: "Overview style" });

    expect(
      within(group)
        .getAllByRole("radio")
        .map((element) => element.getAttribute("value")),
    ).toEqual(["charts", "cards"]);
  });

  it("names each radio by the label under its preview only", () => {
    expect(radio("Charts")).toBeInTheDocument();
    expect(radio("Cards")).toBeInTheDocument();
  });

  it("selects Charts by default", () => {
    expect(radio("Charts")).toBeChecked();
    expect(radio("Cards")).not.toBeChecked();
    expect(tile("charts")).toHaveClass("selected");
    expect(tile("cards")).not.toHaveClass("selected");
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
    for (const value of ["charts", "cards"]) {
      expect(preview(value)).toHaveAttribute("aria-hidden", "true");
      expect(preview(value)).toHaveAttribute("inert");
      expect(within(preview(value)).queryAllByRole("button", { hidden: true })).toEqual([]);
    }
  });

  it("switches both overviews to the cards from a click on the tile", async () => {
    await user.click(preview("cards"));

    expect(state.overviewStyle).toBe("cards");
    expect(radio("Cards")).toBeChecked();
    expect(tile("cards")).toHaveClass("selected");
    expect(tile("charts")).not.toHaveClass("selected");
  });

  it("switches back to the charts from a click on the label", async () => {
    await user.click(screen.getByText("Cards"));
    await user.click(screen.getByText("Charts"));

    expect(state.overviewStyle).toBe("charts");
    expect(radio("Charts")).toBeChecked();
    expect(tile("charts")).toHaveClass("selected");
  });

  it("moves through the styles with the arrow keys", async () => {
    await user.tab();

    expect(radio("Charts")).toHaveFocus();

    await user.keyboard("{ArrowRight}");

    expect(radio("Cards")).toHaveFocus();
    expect(state.overviewStyle).toBe("cards");

    await user.keyboard("{ArrowLeft}");

    expect(radio("Charts")).toHaveFocus();
    expect(state.overviewStyle).toBe("charts");
  });

  it("is a single stop in the tab order", async () => {
    await user.tab();

    expect(radio("Charts")).toHaveFocus();

    await user.tab();

    expect(radio("Cards")).not.toHaveFocus();
  });

  it("follows a change of the preference made elsewhere", async () => {
    state.overviewStyle = "cards";

    expect(await screen.findByRole("radio", { name: "Cards", checked: true })).toBeInTheDocument();
    expect(tile("cards")).toHaveClass("selected");
  });

  it("keeps the description under the previews", () => {
    expect(screen.getByText(/How the cluster and workloads overviews show their numbers/)).toBeInTheDocument();
  });

  it("stores nothing for the default, Charts", () => {
    expect(descriptors.overviewStyle.toStore("charts")).toBeUndefined();
    expect(descriptors.overviewStyle.toStore("cards")).toBe("cards");
  });

  it("reads Charts when nothing or something unknown is stored", () => {
    expect(descriptors.overviewStyle.fromStore(undefined)).toBe("charts");
    expect(descriptors.overviewStyle.fromStore("pies" as never)).toBe("charts");
    expect(descriptors.overviewStyle.fromStore("cards")).toBe("cards");
  });
});
