/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { runInAction } from "mobx";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultColorThemePreference } from "../../common/vars";
import userPreferencesStateInjectable from "../../features/user-preferences/common/state.injectable";
import { getDiForUnitTesting } from "../getDiForUnitTesting";
import activeThemeInjectable from "./active.injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import lensDarkThemeInjectable from "./lens-dark.injectable";
import lensLightThemeInjectable from "./lens-light.injectable";
import { sortThemesForDisplay } from "./sort-for-display";
import systemThemeConfigurationInjectable from "./system-theme.injectable";

import type { DiContainer, Injectable } from "@ogre-tools/injectable";
import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "./lens-theme";

const getOtherThemeInjectable = (name: string, base: Injectable<LensTheme, ReadonlyDeep<LensTheme>>) =>
  getInjectable({
    id: `other-theme-${name}`,
    instantiate: (di): ReadonlyDeep<LensTheme> => ({
      ...di.inject(base),
      name,
      isDefault: false,
      isSystemTheme: false,
    }),
    injectionToken: lensThemeDeclarationInjectionToken,
  });

describe("active theme", () => {
  let di: DiContainer;

  const select = (colorTheme: string, systemTheme: "dark" | "light") => {
    runInAction(() => {
      di.inject(userPreferencesStateInjectable).colorTheme = colorTheme;
      di.inject(systemThemeConfigurationInjectable).set(systemTheme);
    });

    return di.inject(activeThemeInjectable).get().name;
  };

  beforeEach(() => {
    di = getDiForUnitTesting();

    // Themes register alphabetically by file, so a theme whose file sorts before
    // lens-dark comes first. Without the flag, adding one would silently change
    // the theme of everyone who never picked one.
    runInAction(() => {
      di.deregister(lensDarkThemeInjectable, lensLightThemeInjectable);
      di.register(
        getOtherThemeInjectable("Other Dark", lensDarkThemeInjectable),
        getOtherThemeInjectable("Other Light", lensLightThemeInjectable),
        lensDarkThemeInjectable,
        lensLightThemeInjectable,
      );
    });
  });

  it("has other themes of each type registered before the built-in ones", () => {
    const names = di.injectMany(lensThemeDeclarationInjectionToken).map((theme) => theme.name);

    expect(names).toEqual(["Other Dark", "Other Light", "Dark", "Light"]);
  });

  it('lists the themes "Sync with computer" picks first', () => {
    const names = sortThemesForDisplay(di.injectMany(lensThemeDeclarationInjectionToken)).map((theme) => theme.name);

    expect(names).toEqual(["Dark", "Light", "Other Dark", "Other Light"]);
  });

  describe('given the "Sync with computer" preference', () => {
    it("picks the built-in Dark when the computer is in dark mode", () => {
      expect(select(defaultColorThemePreference, "dark")).toBe("Dark");
    });

    it("picks the built-in Light when the computer is in light mode", () => {
      expect(select(defaultColorThemePreference, "light")).toBe("Light");
    });
  });

  describe("given a theme picked by name", () => {
    it("picks that theme, whatever mode the computer is in", () => {
      expect(select("Other Dark", "light")).toBe("Other Dark");
      expect(select("Other Light", "dark")).toBe("Other Light");
    });

    it("falls back to the default theme when the name is unknown", () => {
      expect(select("No Such Theme", "light")).toBe("Dark");
    });
  });
});
