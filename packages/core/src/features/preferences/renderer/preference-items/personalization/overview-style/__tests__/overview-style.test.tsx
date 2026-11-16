/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
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

  const radio = (label: string) => screen.getByText(label).closest("label");

  beforeEach(() => {
    const di = getDiForUnitTesting();

    state = di.inject(userPreferencesStateInjectable);
    descriptors = di.inject(userPreferenceDescriptorsInjectable);
    user = userEvent.setup();
    renderFor(di)(<OverviewStyle />);
  });

  it("selects Cards by default", () => {
    expect(radio("Cards")).toHaveClass("checked");
    expect(radio("Charts")).not.toHaveClass("checked");
  });

  it("switches both overviews to the charts", async () => {
    await user.click(screen.getByText("Charts"));

    expect(state.overviewStyle).toBe("charts");
    expect(radio("Charts")).toHaveClass("checked");
    expect(radio("Cards")).not.toHaveClass("checked");
  });

  it("switches back to the cards", async () => {
    await user.click(screen.getByText("Charts"));
    await user.click(screen.getByText("Cards"));

    expect(state.overviewStyle).toBe("cards");
    expect(radio("Cards")).toHaveClass("checked");
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
