/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderFor } from "../../../../../../../renderer/components/test-utils/renderFor";
import { getDiForUnitTesting } from "../../../../../../../renderer/getDiForUnitTesting";
import { parseThemeFile } from "../../../../../../theme/files/common/parse";
import importedThemesStateInjectable from "../../../../../../theme/files/renderer/imported-themes-state.injectable";
import themeActionsInjectable from "../../../../../../theme/files/renderer/request-theme-actions.injectable";
import userPreferencesStateInjectable from "../../../../../../user-preferences/common/state.injectable";
import { ThemeVariant } from "../../theme-variant/theme-variant";
import { Themes } from "../themes";

import type { DiContainer } from "@ogre-tools/injectable";
import type { UserEvent } from "@testing-library/user-event";

import type { ThemeActions } from "../../../../../../theme/files/renderer/request-theme-actions.injectable";
import type { UserPreferencesState } from "../../../../../../user-preferences/common/state.injectable";

const darkOnly = `apiVersion: freelens.app/v1
kind: Theme
metadata:
  name: midnight
spec:
  displayName: Midnight
  dark:
    colors:
      mainBackground: "#000000"
`;

describe("themes preference", () => {
  let di: DiContainer;
  let state: UserPreferencesState;
  let user: UserEvent;
  let exportTheme: ThemeActions["exportTheme"] & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    exportTheme = vi.fn(async () => ({ status: "canceled" as const }));

    const themeActions: ThemeActions = {
      importTheme: async () => ({ status: "canceled" }),
      exportTheme,
      removeTheme: async () => ({ status: "removed" }),
    };

    di.override(themeActionsInjectable, () => themeActions);

    const parsed = parseThemeFile(darkOnly);

    if (!parsed.isValid) {
      throw new Error(parsed.error);
    }

    di.inject(importedThemesStateInjectable).set({
      themes: [{ theme: parsed.theme, fileName: "midnight.yaml", unknownTokens: [] }],
      invalidFiles: [{ fileName: "broken.yaml", error: "Unsupported kind" }],
    });

    state = di.inject(userPreferencesStateInjectable);
    state.theme = "freelens";
    state.themeVariant = "system";
    user = userEvent.setup();
    renderFor(di)(
      <>
        <Themes />
        <ThemeVariant />
      </>,
    );
  });

  it("selects the built-in theme by default", () => {
    expect(screen.getByTestId("theme-select-freelens")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("theme-select-midnight")).toHaveAttribute("aria-pressed", "false");
  });

  it("previews both variants of the built-in theme and the single one of an imported theme", () => {
    expect(screen.getByTestId("theme-preview-freelens-dark")).toBeInTheDocument();
    expect(screen.getByTestId("theme-preview-freelens-light")).toBeInTheDocument();
    expect(screen.getByTestId("theme-preview-midnight-dark")).toBeInTheDocument();
    expect(screen.queryByTestId("theme-preview-midnight-light")).not.toBeInTheDocument();
  });

  it("marks imported themes and lets only them be removed", () => {
    expect(screen.getByTestId("theme-card-midnight")).toHaveTextContent("Imported");
    expect(screen.getByTestId("theme-card-freelens")).not.toHaveTextContent("Imported");
    expect(screen.queryByTestId("theme-remove-freelens")).not.toBeInTheDocument();
    expect(screen.getByTestId("theme-remove-midnight")).toBeInTheDocument();
  });

  it("lists the built-in themes first, the default leading, then the imported ones", () => {
    const cards = screen.getAllByRole("listitem").map((card) => card.getAttribute("data-testid"));

    expect(cards).toEqual([
      "theme-card-freelens",
      "theme-card-ayu",
      "theme-card-ayu-mirage",
      "theme-card-dracula",
      "theme-card-graphite",
      "theme-card-catppuccin",
      "theme-card-solarized",
      "theme-card-high-contrast",
      "theme-card-midnight",
    ]);
  });

  it.each(["ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized", "high-contrast"])(
    "shows the built-in theme %s in both variants, without Remove or the marker",
    (name) => {
      expect(screen.getByTestId(`theme-preview-${name}-dark`)).toBeInTheDocument();
      expect(screen.getByTestId(`theme-preview-${name}-light`)).toBeInTheDocument();
      expect(screen.getByTestId(`theme-card-${name}`)).not.toHaveTextContent("Imported");
      expect(screen.queryByTestId(`theme-remove-${name}`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`theme-export-${name}`)).toBeInTheDocument();
    },
  );

  it("lists the files that are not applied", () => {
    expect(screen.getByTestId("invalid-theme-files")).toHaveTextContent("broken.yaml");
    expect(screen.getByTestId("invalid-theme-files")).toHaveTextContent("Unsupported kind");
  });

  it("selects a theme", async () => {
    await user.click(screen.getByTestId("theme-select-midnight"));

    expect(state.theme).toBe("midnight");
  });

  it("exports any theme, the built-in one included", async () => {
    await user.click(screen.getByTestId("theme-export-freelens"));

    expect(exportTheme).toHaveBeenCalledWith("freelens");
  });

  it("disables the variant control for a theme with a single variant", async () => {
    expect(screen.getByRole("radio", { name: "Light" })).toBeEnabled();

    await user.click(screen.getByTestId("theme-select-midnight"));

    expect(screen.getByRole("radio", { name: "Light" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getByText("Midnight has only a dark variant.")).toBeInTheDocument();
  });
});
