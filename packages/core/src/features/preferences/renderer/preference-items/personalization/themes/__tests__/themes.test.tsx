/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../../../../../renderer/components/confirm-dialog";
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

import type { ImportThemeRequest, ImportThemeResponse } from "../../../../../../theme/files/common/channels";
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
  let importTheme: ReturnType<typeof vi.fn<(request: ImportThemeRequest) => Promise<ImportThemeResponse>>>;

  beforeEach(() => {
    di = getDiForUnitTesting();
    exportTheme = vi.fn(async () => ({ status: "canceled" as const }));

    importTheme = vi.fn(async (): Promise<ImportThemeResponse> => ({ status: "canceled" }));

    const themeActions: ThemeActions = {
      importTheme: importTheme as ThemeActions["importTheme"],
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
        <ConfirmDialog />
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

  describe("the import dialog", () => {
    const url = "https://example.com/themes/midnight-blue.yaml";
    const imported: ImportThemeResponse = {
      status: "imported",
      name: "midnight-blue",
      displayName: "Midnight Blue",
      unknownTokens: [],
    };

    const urlInput = () => screen.getByTestId("theme-import-url");
    const isOpen = () => screen.queryByTestId("theme-import-dialog") !== null;

    beforeEach(async () => {
      await user.click(screen.getByTestId("theme-import"));
    });

    it("opens with an input for the URL, Browse, Import and Cancel", () => {
      expect(urlInput()).toHaveAttribute("placeholder", "URL of a theme file (.yaml, .yml, .json)");
      expect(screen.getByTestId("theme-import-browse")).toBeInTheDocument();
      expect(screen.getByTestId("theme-import-submit")).toHaveTextContent("Import");
      expect(screen.getByTestId("theme-import-cancel")).toHaveTextContent("Cancel");
      expect(importTheme).not.toHaveBeenCalled();
    });

    it("imports from the URL and closes", async () => {
      importTheme.mockResolvedValue(imported);

      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-submit"));

      await waitFor(() => expect(importTheme).toHaveBeenCalledWith({ action: "url", url }));
      await waitFor(() => expect(isOpen()).toBe(false));
    });

    it("shows why the theme was refused, and stays open with the URL", async () => {
      importTheme.mockResolvedValue({
        status: "invalid",
        source: url,
        error: "The theme file is larger than 100 KiB",
      });

      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-submit"));

      expect(await screen.findByTestId("theme-import-error")).toHaveTextContent(
        "The theme file is larger than 100 KiB",
      );
      expect(isOpen()).toBe(true);
      expect(urlInput()).toHaveValue(url);
    });

    it("drops the error of an attempt as soon as the URL changes", async () => {
      importTheme.mockResolvedValue({
        status: "invalid",
        source: url,
        error: "The theme file is larger than 100 KiB",
      });

      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-submit"));
      await screen.findByTestId("theme-import-error");

      await user.type(urlInput(), "x");

      expect(screen.queryByTestId("theme-import-error")).not.toBeInTheDocument();
    });

    it("shows a failed request in the dialog", async () => {
      importTheme.mockRejectedValue(new Error("No handler"));

      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-submit"));

      expect(await screen.findByTestId("theme-import-error")).toHaveTextContent("No handler");
      expect(isOpen()).toBe(true);
    });

    it.each(["file:///etc/passwd", "ftp://example.com/theme.yaml", "not a url"])(
      "refuses %j before sending it",
      async (value) => {
        await user.type(urlInput(), value);
        await user.click(screen.getByTestId("theme-import-submit"));

        // The input shows its errors a moment after the last change.
        expect(
          await screen.findByText("Enter an https: or http: URL", undefined, { timeout: 2000 }),
        ).toBeInTheDocument();
        expect(importTheme).not.toHaveBeenCalled();
      },
    );

    it("lets Browse ask the main process for a file, sending no path and no URL", async () => {
      importTheme.mockResolvedValue(imported);

      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-browse"));

      await waitFor(() => expect(importTheme).toHaveBeenCalledWith({ action: "choose" }));
      expect(importTheme).toHaveBeenCalledOnce();
      await waitFor(() => expect(isOpen()).toBe(false));
    });

    it("stays open when Browse is canceled", async () => {
      await user.click(screen.getByTestId("theme-import-browse"));

      await waitFor(() => expect(importTheme).toHaveBeenCalledWith({ action: "choose" }));
      expect(isOpen()).toBe(true);
      expect(screen.queryByTestId("theme-import-error")).not.toBeInTheDocument();
    });

    it("closes and asks about a conflict, then replaces when asked to", async () => {
      importTheme.mockResolvedValueOnce({
        status: "conflict",
        importId: "import-1",
        name: "midnight",
        displayName: "Midnight Blue",
        fileName: "midnight.yaml",
        conflicts: [{ kind: "same-name", fileName: "midnight.yaml", displayName: "Midnight" }],
      });
      importTheme.mockResolvedValueOnce(imported);

      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-submit"));

      expect(await screen.findByTestId("theme-import-conflict")).toHaveTextContent("Midnight Blue");
      await waitFor(() => expect(isOpen()).toBe(false));

      await user.click(screen.getByTestId("confirm"));

      await waitFor(() => expect(importTheme).toHaveBeenLastCalledWith({ action: "replace", importId: "import-1" }));
    });

    it("closes on Cancel, and opens empty again", async () => {
      await user.type(urlInput(), url);
      await user.click(screen.getByTestId("theme-import-cancel"));

      await waitFor(() => expect(isOpen()).toBe(false));

      await user.click(screen.getByTestId("theme-import"));

      expect(urlInput()).toHaveValue("");
      expect(importTheme).not.toHaveBeenCalled();
    });
  });
});
