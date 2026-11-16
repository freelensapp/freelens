/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
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

  it("sets a hex code entered under Custom and marks Custom as selected", async () => {
    await user.click(screen.getByTestId("accent-color-dark-custom"));
    await user.clear(screen.getByTestId("accent-color-dark-custom-hex"));
    await user.type(screen.getByTestId("accent-color-dark-custom-hex"), "123456");
    await user.tab();

    expect(state.accentColorDark).toBe("#123456");
    expect(screen.getByTestId("accent-color-dark-custom")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("accent-color-light-custom")).toHaveAttribute("aria-pressed", "false");
  });

  it("starts the Custom picker from the selected color", async () => {
    await user.click(screen.getByTestId("accent-color-light-purple"));
    await user.click(screen.getByTestId("accent-color-light-custom"));

    expect(screen.getByTestId("accent-color-light-custom-hex")).toHaveValue("#9c27b0");
  });

  it("closes the Custom picker with Escape and keeps the entered color", async () => {
    await user.click(screen.getByTestId("accent-color-dark-custom"));
    await user.clear(screen.getByTestId("accent-color-dark-custom-hex"));
    await user.type(screen.getByTestId("accent-color-dark-custom-hex"), "abcdef");
    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("accent-color-dark-custom-panel")).not.toBeInTheDocument();
    expect(state.accentColorDark).toBe("#abcdef");
  });

  it("describes Custom in a tooltip", () => {
    expect(screen.getByTestId("tooltip-content-for-accent-color-dark-custom")).toHaveTextContent("hex code");
  });
});
