/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import { findBuiltInTheme } from "../../../../../../theme/files/common/builtin-theme";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { AccentColor } from "../accent-color";

import type { UserEvent } from "@testing-library/user-event";

import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

const teal = "#00a7a0";

describe("accent color preference", () => {
  let state: UserPreferencesState;
  let user: UserEvent;

  beforeEach(() => {
    const di = getDiForUnitTesting();

    state = di.inject(userPreferencesStateInjectable);
    user = userEvent.setup();
    renderFor(di)(<AccentColor />);
  });

  it("selects Theme for both variants by default", () => {
    expect(screen.getByTestId("accent-color-dark-theme")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-light-theme")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("accent-color-light-teal")).toHaveAttribute("aria-pressed", "false");
  });

  it("puts Theme first in each row", () => {
    const [dark, light] = screen.getAllByRole("group");

    expect(dark.querySelector("button")).toHaveAttribute("data-testid", "accent-color-dark-theme");
    expect(light.querySelector("button")).toHaveAttribute("data-testid", "accent-color-light-theme");
  });

  it("shows the accent of the default theme in each variant under Theme", () => {
    expect(screen.getByTestId("accent-color-dark-theme")).toHaveStyle({ backgroundColor: teal });
    expect(screen.getByTestId("accent-color-light-theme")).toHaveStyle({ backgroundColor: teal });
  });

  it("names the theme in the tooltip of Theme", () => {
    expect(screen.getByTestId("tooltip-content-for-accent-color-dark-theme")).toHaveTextContent(
      "The accent of the Freelens theme",
    );
  });

  it("stores Teal like any other color", async () => {
    await user.click(screen.getByTestId("accent-color-dark-teal"));

    expect(state.accentColorDark).toBe(teal);
    expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-dark-theme")).toHaveAttribute("aria-pressed", "false");
  });

  it("clears the choice with Theme", async () => {
    await user.click(screen.getByTestId("accent-color-light-purple"));
    await user.click(screen.getByTestId("accent-color-light-theme"));

    expect(state.accentColorLight).toBeUndefined();
    expect(screen.getByTestId("accent-color-light-theme")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-light-purple")).toHaveAttribute("aria-pressed", "false");
  });

  it("starts the Custom picker from the accent of the theme without a choice", async () => {
    await user.click(screen.getByTestId("accent-color-dark-custom"));

    expect(screen.getByTestId("accent-color-dark-custom-hex")).toHaveValue(teal);
  });

  it("names each color in a tooltip", () => {
    expect(screen.getByTestId("tooltip-content-for-accent-color-dark-purple")).toHaveTextContent("Purple");
  });

  it("sets the accent of the dark variant only", async () => {
    await user.click(screen.getByTestId("accent-color-dark-purple"));

    expect(state.accentColorDark).toBe("#9c27b0");
    expect(state.accentColorLight).toBeUndefined();
    expect(screen.getByTestId("accent-color-dark-purple")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("accent-color-dark-theme")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("accent-color-light-theme")).toHaveAttribute("aria-pressed", "true");
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
    expect(screen.getByTestId("accent-color-dark-theme")).toHaveAttribute("aria-pressed", "false");
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

  describe("with Ayu active", () => {
    beforeEach(() => {
      runInAction(() => {
        state.theme = "ayu";
      });
    });

    it("shows Ayu's own accent of each variant under Theme", () => {
      expect(screen.getByTestId("accent-color-dark-theme")).toHaveStyle({
        backgroundColor: findBuiltInTheme("ayu")?.spec.dark?.colors?.primary,
      });
      expect(screen.getByTestId("accent-color-light-theme")).toHaveStyle({
        backgroundColor: findBuiltInTheme("ayu")?.spec.light?.colors?.primary,
      });
    });

    it("names Ayu in the tooltip of Theme", () => {
      expect(screen.getByTestId("tooltip-content-for-accent-color-light-theme")).toHaveTextContent(
        "The accent of the Ayu theme",
      );
    });

    it("selects Theme, not Teal, without a choice", () => {
      expect(screen.getByTestId("accent-color-dark-theme")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "false");
    });

    it("stores Teal when it is chosen", async () => {
      await user.click(screen.getByTestId("accent-color-dark-teal"));

      expect(state.accentColorDark).toBe(teal);
      expect(screen.getByTestId("accent-color-dark-teal")).toHaveAttribute("aria-pressed", "true");
    });
  });
});
