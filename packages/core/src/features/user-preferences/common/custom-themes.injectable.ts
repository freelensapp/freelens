/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { observable, action, makeObservable } from "mobx";
import userPreferencesStateInjectable from "./state.injectable";
import type { LensTheme, LensColorName, TerminalColorName } from "../../../renderer/themes/lens-theme";

export interface CustomTheme extends LensTheme {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomThemesState {
  themes: CustomTheme[];
  addTheme: (theme: Omit<CustomTheme, "id" | "createdAt" | "updatedAt">) => CustomTheme;
  updateTheme: (id: string, updates: Partial<Omit<CustomTheme, "id" | "createdAt">>) => void;
  deleteTheme: (id: string) => void;
  getTheme: (id: string) => CustomTheme | undefined;
  exportTheme: (id: string) => string;
  importTheme: (json: string) => CustomTheme;
}

const customThemesInjectable = getInjectable({
  id: "custom-themes",
  instantiate: (di) => {
    const state = di.inject(userPreferencesStateInjectable);

    // Initialize custom themes from preferences
    const storedThemes = state.customThemes || [];
    const themes = observable.array<CustomTheme>(storedThemes);

    const customThemesState: CustomThemesState = {
      themes,

      addTheme: action((themeData) => {
        const now = Date.now();
        const newTheme: CustomTheme = {
          ...themeData,
          id: `custom-${now}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        themes.push(newTheme);
        state.customThemes = themes.slice();
        return newTheme;
      }),

      updateTheme: action((id, updates) => {
        const index = themes.findIndex((t) => t.id === id);
        if (index !== -1) {
          const updated = {
            ...themes[index],
            ...updates,
            updatedAt: Date.now(),
          };
          themes[index] = updated;
          state.customThemes = themes.slice();
        }
      }),

      deleteTheme: action((id) => {
        const index = themes.findIndex((t) => t.id === id);
        if (index !== -1) {
          themes.splice(index, 1);
          state.customThemes = themes.slice();
        }
      }),

      getTheme: (id) => themes.find((t) => t.id === id),

      exportTheme: (id) => {
        const theme = themes.find((t) => t.id === id);
        if (!theme) throw new Error(`Theme ${id} not found`);
        return JSON.stringify(theme, null, 2);
      },

      importTheme: action((json) => {
        const parsed = JSON.parse(json) as Omit<CustomTheme, "id" | "createdAt" | "updatedAt">;
        return customThemesState.addTheme(parsed);
      }),
    };

    makeObservable(customThemesState, {
      themes: observable,
      addTheme: action,
      updateTheme: action,
      deleteTheme: action,
      importTheme: action,
    });

    return customThemesState;
  },
});

export default customThemesInjectable;
