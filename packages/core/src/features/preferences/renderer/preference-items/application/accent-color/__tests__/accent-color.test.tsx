/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { AccentColor } from "../accent-color";

import type { UserEvent } from "@testing-library/user-event";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

describe("accent color preference", () => {
  let state: UserPreferencesState;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    state = di.inject(userPreferencesStateInjectable);
    user = userEvent.setup();
    renderFor(di)(<AccentColor />);
  });

  it("selects Teal for both variants by default", () => {
    expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-light-teal")).toHaveAttribute("aria-pressed", "true");
  });

  it("names each color in a tooltip", () => {
    expect(screen.getByTestId("tooltip-content-for-accent-color-dark-purple")).toHaveTextContent("Purple");
  });

  it("sets the accent of the dark variant only", async () => {
    await user.click(screen.getByTestId("accent-color-dark-purple"));

    expect(state.accentColorDark).toBe("#9c27b0");
    expect(state.accentColorLight).toBeUndefined();
    expect(screen.getByTestId("accent-color-dark-purple")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("accent-color-light-teal")).toHaveAttribute("aria-pressed", "true");
  });

  it("sets the accent of the light variant only", async () => {
    await user.click(screen.getByTestId("accent-color-light-cyan"));

    expect(state.accentColorLight).toBe("#00bcd4");
    expect(state.accentColorDark).toBeUndefined();
  });

  it("sets any color picked with Custom and marks Custom as selected", () => {
    fireEvent.change(screen.getByTestId("accent-color-dark-custom-input"), { target: { value: "#123456" } });

    expect(state.accentColorDark).toBe("#123456");
    expect(screen.getByTestId("accent-color-dark-custom")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("accent-color-light-custom")).toHaveAttribute("aria-pressed", "false");
  });
});
