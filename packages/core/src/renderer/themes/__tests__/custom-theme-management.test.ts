/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { defaultThemeId } from "../../../common/vars";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import deleteCustomThemeInjectable from "../delete-custom-theme.injectable";
import saveCustomThemeInjectable from "../save-custom-theme.injectable";

import type { DiContainer } from "@ogre-tools/injectable";

import type { UserPreferencesState } from "../../../features/user-preferences/common/state.injectable";
import type { LensTheme } from "../lens-theme";

describe("custom theme management", () => {
  let di: DiContainer;
  let state: UserPreferencesState;
  let saveCustomTheme: (theme: LensTheme) => void;
  let deleteCustomTheme: (themeName: string) => void;

  beforeEach(() => {
    di = getDiForUnitTesting();
    state = di.inject(userPreferencesStateInjectable);
    saveCustomTheme = di.inject(saveCustomThemeInjectable);
    deleteCustomTheme = di.inject(deleteCustomThemeInjectable);

    state.customThemes = [];
  });

  it("saves a new custom theme", () => {
    const newTheme: Partial<LensTheme> = {
      name: "New Theme",
      type: "dark",
      description: "Test",
      author: "User",
      monacoTheme: "clouds-midnight",
      isCustom: true,
      colors: { primary: "#ff0000" } as any,
      terminalColors: {},
    };

    saveCustomTheme(newTheme as LensTheme);

    expect(state.customThemes).toHaveLength(1);
    expect(state.customThemes[0].name).toBe("New Theme");
    expect(state.customThemes[0].isCustom).toBe(true);
  });

  it("updates an existing custom theme", () => {
    const originalTheme: Partial<LensTheme> = {
      name: "Existing Theme",
      type: "dark",
      colors: { primary: "#ff0000" } as any,
      description: "",
      author: "",
      monacoTheme: "clouds-midnight",
      terminalColors: {},
    };

    state.customThemes = [originalTheme as LensTheme];

    const updatedTheme: Partial<LensTheme> = {
      ...originalTheme,
      colors: { primary: "#00ff00" } as any,
    };

    saveCustomTheme(updatedTheme as LensTheme);

    expect(state.customThemes).toHaveLength(1);
    expect(state.customThemes[0].colors.primary).toBe("#00ff00");
  });

  it("deletes a custom theme by name", () => {
    state.customThemes = [
      { name: "Theme 1", type: "dark" } as LensTheme,
      { name: "Theme 2", type: "light" } as LensTheme,
    ];

    deleteCustomTheme("Theme 1");

    expect(state.customThemes).toHaveLength(1);
    expect(state.customThemes[0].name).toBe("Theme 2");
  });

  it("resets to default theme when deleting active theme", () => {
    const customTheme: Partial<LensTheme> = {
      name: "Active Custom",
      type: "dark",
      description: "",
      author: "",
      monacoTheme: "clouds-midnight",
      colors: {} as any,
      terminalColors: {},
    };

    state.customThemes = [customTheme as LensTheme];
    state.colorTheme = "Active Custom";

    deleteCustomTheme("Active Custom");

    expect(state.colorTheme).toBe(defaultThemeId);
    expect(state.customThemes).toHaveLength(0);
  });
});
