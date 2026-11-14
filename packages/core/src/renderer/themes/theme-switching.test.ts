/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultColorThemePreference } from "../../common/vars";
import userPreferenceDescriptorsInjectable from "../../features/user-preferences/common/preference-descriptors.injectable";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { migrateLegacyCustomAiToolCommand } from "../../features/user-preferences/common/storage.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import activeThemeInjectable from "./active.injectable";
import allLensThemesInjectable from "./all-themes.injectable";
import defaultLensThemeInjectable from "./default-theme.injectable";
import { applyAppearance } from "./setup-apply-appearance.injectable";
import systemThemeConfigurationInjectable from "./system-theme.injectable";
import xtermColorThemeInjectable from "./terminal-colors.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { UserPreferencesState } from "../../features/user-preferences/common/state.injectable";

describe("theme switching", () => {
  let di: DiContainer;
  let state: UserPreferencesState;

  beforeEach(() => {
    di = getDiForUnitTesting();
    state = di.inject(userPreferencesStateInjectable);
    runInAction(() => {
      state.colorTheme = defaultColorThemePreference;
      state.terminalTheme = "";
      state.customThemes = [];
    });
  });

  const activeName = () => di.inject(activeThemeInjectable).get().name;

  it("defaults to ProLens Dark", () => {
    expect(di.inject(defaultLensThemeInjectable).name).toBe("ProLens Dark");
  });

  it("lists the built-in themes, the classic ones included", () => {
    expect([...di.inject(allLensThemesInjectable).get().keys()]).toEqual(
      expect.arrayContaining([
        "ProLens Dark",
        "ProLens Light",
        "Midnight",
        "Graphite",
        "Nord",
        "Aurora",
        "High Contrast",
        "Dark",
        "Light",
      ]),
    );
  });

  it("follows the computer between ProLens Dark and ProLens Light", () => {
    const system = di.inject(systemThemeConfigurationInjectable);

    runInAction(() => system.set("light"));
    expect(activeName()).toBe("ProLens Light");

    runInAction(() => system.set("dark"));
    expect(activeName()).toBe("ProLens Dark");
  });

  it("switches to the chosen theme immediately", () => {
    runInAction(() => (state.colorTheme = "Nord"));
    expect(activeName()).toBe("Nord");

    runInAction(() => (state.colorTheme = "High Contrast"));
    expect(activeName()).toBe("High Contrast");
  });

  it("falls back to the default for a theme that no longer exists", () => {
    runInAction(() => (state.colorTheme = "Removed Theme"));
    expect(activeName()).toBe("ProLens Dark");
  });

  it("applies the accent colour to the active theme", () => {
    runInAction(() => {
      state.colorTheme = "Graphite";
      state.appearance = { ...state.appearance, accentColor: "#ff00aa" };
    });

    const theme = di.inject(activeThemeInjectable).get();

    expect(theme.name).toBe("Graphite");
    expect(theme.colors.primary).toBe("#ff00aa");
    expect(theme.colors.buttonPrimaryBackground).toBe("#ff00aa");
  });

  it("selects a custom theme, and uses it for the terminal", () => {
    runInAction(() => {
      state.customThemes = [
        {
          name: "Ocean",
          type: "dark",
          extends: "Nord",
          colors: { mainBackground: "#001122" },
          terminalColors: { background: "#000011" },
        },
      ];
      state.colorTheme = "Ocean";
    });

    expect(di.inject(activeThemeInjectable).get().colors.mainBackground).toBe("#001122");
    expect(di.inject(xtermColorThemeInjectable).get().background).toBe("#000011");
  });

  it("uses a separately chosen terminal theme", () => {
    runInAction(() => {
      state.colorTheme = "ProLens Light";
      state.terminalTheme = "Midnight";
    });

    expect(di.inject(xtermColorThemeInjectable).get().background).toBe(
      di.inject(allLensThemesInjectable).get().get("Midnight")?.theme.terminalColors.background,
    );
  });
});

describe("appearance applied to the document", () => {
  it("sets the density attribute and font sizes", () => {
    const root = document.createElement("html");

    applyAppearance(root, { density: "compact", fontSize: 15 });

    expect(root.dataset.density).toBe("compact");
    expect(root.style.getPropertyValue("--font-size")).toBe("15px");
    expect(root.style.getPropertyValue("--font-size-small")).toBe("13px");
    expect(root.style.getPropertyValue("--font-size-big")).toBe("17px");
  });
});

describe("persistence of the ProLens preferences", () => {
  const descriptors = () => getDiForUnitTesting().inject(userPreferenceDescriptorsInjectable);

  it("stores nothing for default appearance and only what differs otherwise", () => {
    const { appearance } = descriptors();

    expect(appearance.toStore(appearance.fromStore(undefined))).toBeUndefined();
    expect(appearance.toStore({ accentColor: "#123456", density: "compact", fontSize: 13 })).toEqual({
      accentColor: "#123456",
      density: "compact",
    });
    expect(
      appearance.fromStore(appearance.toStore({ accentColor: undefined, density: "comfortable", fontSize: 16 })),
    ).toEqual({
      accentColor: undefined,
      density: "comfortable",
      fontSize: 16,
    });
  });

  it("round-trips custom themes and drops invalid ones", () => {
    const { customThemes } = descriptors();
    const ocean = { name: "Ocean", type: "dark" as const, colors: { primary: "#00aaff" } };

    expect(customThemes.fromStore(customThemes.toStore([ocean]))).toEqual([ocean]);
    expect(customThemes.toStore([])).toBeUndefined();
    expect(customThemes.fromStore([ocean, { name: 3 }] as never)).toEqual([ocean]);
  });

  it("round-trips AI tool settings", () => {
    const { aiToolSettings, aiTool } = descriptors();
    const settings = { "codex-cli": { executablePath: "/opt/codex", arguments: "{prompt}" } };

    expect(aiToolSettings.fromStore(aiToolSettings.toStore(settings))).toEqual(settings);
    expect(aiToolSettings.toStore({})).toBeUndefined();
    expect(aiTool.fromStore(aiTool.toStore("gemini-cli"))).toBe("gemini-cli");
  });

  it("moves the command of the custom tool from early ProLens builds into its settings", () => {
    expect(migrateLegacyCustomAiToolCommand(undefined, { customAiToolCommand: " my-ai " })).toEqual({
      custom: { executablePath: "my-ai" },
    });
    expect(
      migrateLegacyCustomAiToolCommand({ custom: { executablePath: "kept" } }, { customAiToolCommand: "other" }),
    ).toEqual({ custom: { executablePath: "kept" } });
    expect(migrateLegacyCustomAiToolCommand(undefined, {})).toBeUndefined();
  });
});
