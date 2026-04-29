/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { computed } from "mobx";
import customAccentColorInjectable from "../../../features/user-preferences/common/custom-accent-color.injectable";
import lensColorThemePreferenceInjectable from "../../../features/user-preferences/common/lens-color-theme.injectable";
import { getDiForUnitTesting } from "../../getDiForUnitTesting";
import activeThemeInjectable from "../active.injectable";
import defaultLensThemeInjectable from "../default-theme.injectable";
import systemThemeConfigurationInjectable from "../system-theme.injectable";

import type { DiContainer } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

import type { LensTheme } from "../lens-theme";

const DEFAULT_ACCENT_COLOR = "#00a7a0";

const createMockTheme = (overrides: Partial<LensTheme> = {}): LensTheme => ({
  name: "Test Theme",
  type: "dark",
  description: "Test theme",
  author: "Test",
  monacoTheme: "vs-dark",
  colors: {
    blue: DEFAULT_ACCENT_COLOR,
    magenta: "#c93dce",
    golden: "#ffc63d",
    halfGray: "#87909c80",
    primary: DEFAULT_ACCENT_COLOR,
    textColorPrimary: "#8e9297",
    textColorSecondary: "#a0a0a0",
    textColorTertiary: "#909ba6",
    textColorAccent: "#ffffff",
    textColorDimmed: "#8e92978c",
    borderColor: "#4c5053",
    borderFaintColor: "#373a3e",
    mainBackground: "#1e2124",
    secondaryBackground: "#1e2125",
    contentColor: "#262b2f",
    layoutBackground: "#2e3136",
    layoutTabsBackground: "#252729",
    layoutTabsActiveColor: "#ffffff",
    layoutTabsLineColor: "#87909c80",
    sidebarBackground: "#36393e",
    sidebarLogoBackground: "#414448",
    sidebarActiveColor: "#ffffff",
    sidebarSubmenuActiveColor: DEFAULT_ACCENT_COLOR,
    sidebarItemHoverBackground: "#3a3e44",
    badgeBackgroundColor: "#ffba44",
    buttonPrimaryBackground: DEFAULT_ACCENT_COLOR,
    buttonDefaultBackground: "#414448",
    buttonLightBackground: "#f1f1f1",
    buttonAccentBackground: "#e85555",
    buttonDisabledBackground: "#808080",
    tableBgcStripe: "#2a2d33",
    tableBgcSelected: "#383c42",
    tableHeaderBackground: "#262b2f",
    tableHeaderColor: "#ffffff",
    tableSelectedRowColor: "#ffffff",
    helmLogoBackground: "#ffffff",
    helmStableRepo: DEFAULT_ACCENT_COLOR,
    helmIncubatorRepo: "#ff7043",
    helmDescriptionHr: "#41474a",
    helmDescriptionBlockquoteColor: "#bbb",
    helmDescriptionBlockquoteBorder: "#8a8f93",
    helmDescriptionBlockquoteBackground: "#3b4348",
    helmDescriptionHeaders: "#3e4147",
    helmDescriptionH6: "#6a737d",
    helmDescriptionTdBorder: "#47494a",
    helmDescriptionTrBackground: "#1c2125",
    helmDescriptionCodeBackground: "#ffffff1a",
    helmDescriptionPreBackground: "#1b1f21",
    helmDescriptionPreColor: "#b4b5b4",
    colorSuccess: "#43a047",
    colorOk: "#4caf50",
    colorInfo: DEFAULT_ACCENT_COLOR,
    colorError: "#ce3933",
    colorSoftError: "#e85555",
    colorWarning: "#ff9800",
    colorVague: "#36393e",
    colorTerminated: "#4c5053",
    dockHeadBackground: "#2e3136",
    dockInfoBackground: "#1e2125",
    dockInfoBorderColor: "#303136",
    dockEditorBackground: "#000000",
    dockEditorTag: "#8e97a3",
    dockEditorKeyword: "#ffffff",
    dockEditorComment: "#808080",
    dockEditorActiveLineBackground: "#3a3d41",
    dockBadgeBackground: "#36393e",
    dockTabBorderColor: "#43424d",
    dockTabActiveBackground: "#3a3e45",
    logsBackground: "#000000",
    logsForeground: "#ffffff",
    logRowHoverBackground: "#35373a",
    dialogTextColor: "#87909c",
    dialogBackground: "#ffffff",
    dialogHeaderBackground: "#36393e",
    dialogFooterBackground: "#f4f4f4",
    drawerTogglerBackground: "#2f343a",
    drawerTitleText: "#ffffff",
    drawerSubtitleBackground: "#373a3e",
    drawerItemNameColor: "#87909c",
    drawerItemValueColor: "#a0a0a0",
    clusterMenuBackground: "#252729",
    clusterMenuBorderColor: "#252729",
    clusterMenuCellBackground: "#2e3136",
    clusterMenuCellOutline: "#ffffff66",
    clusterSettingsBackground: "#1e2124",
    addClusterIconColor: "#252729",
    boxShadow: "#0000003a",
    iconActiveColor: "#ffffff",
    iconActiveBackground: "#ffffff18",
    filterAreaBackground: "#23272b",
    chartLiveBarBackground: "#00000033",
    chartStripesColor: "#ffffff08",
    chartCapacityColor: "#4c545f",
    pieChartDefaultColor: "#30353a",
    inputOptionHoverColor: "#87909c",
    inputControlBackground: "#1e2125",
    inputControlBorder: "#414448",
    inputControlHoverBorder: "#474a4f",
    lineProgressBackground: "#414448",
    radioActiveBackground: "#36393e",
    menuActiveBackground: DEFAULT_ACCENT_COLOR,
    menuSelectedOptionBgc: "#36393e",
    canvasBackground: "#24292e",
    scrollBarColor: "#5f6064",
    settingsBackground: "#262b2e",
    settingsColor: "#909ba6",
    navSelectedBackground: "#262b2e",
    navHoverColor: "#dcddde",
    hrColor: "#ffffff0f",
    tooltipBackground: "#18191c",
  },
  terminalColors: {},
  ...overrides,
});

describe("active theme with custom accent color", () => {
  let di: DiContainer;
  let activeTheme: IComputedValue<LensTheme>;
  let mockCustomAccentColor: string | undefined;
  let mockSystemThemeType: "dark" | "light";
  let mockColorThemePreference: { useSystemTheme: boolean; lensThemeId: string };
  let mockDarkTheme: LensTheme;

  beforeEach(() => {
    di = getDiForUnitTesting();

    mockCustomAccentColor = undefined;
    mockSystemThemeType = "dark";
    mockColorThemePreference = { useSystemTheme: false, lensThemeId: "lens-dark" };
    mockDarkTheme = createMockTheme({ name: "Dark", type: "dark" });

    di.override(customAccentColorInjectable, () => computed(() => mockCustomAccentColor));
    di.override(lensColorThemePreferenceInjectable, () => computed(() => mockColorThemePreference));
    di.override(defaultLensThemeInjectable, () => mockDarkTheme);
    di.override(systemThemeConfigurationInjectable, () => computed(() => mockSystemThemeType));
  });

  describe("when no custom accent color is set", () => {
    it("returns the base theme unchanged", () => {
      activeTheme = di.inject(activeThemeInjectable);
      const theme = activeTheme.get();

      expect(theme.colors.primary).toBe(DEFAULT_ACCENT_COLOR);
      expect(theme.colors.blue).toBe(DEFAULT_ACCENT_COLOR);
      expect(theme.colors.buttonPrimaryBackground).toBe(DEFAULT_ACCENT_COLOR);
    });
  });

  describe("when custom accent color is set", () => {
    const customColor = "#4caf50";

    beforeEach(() => {
      mockCustomAccentColor = customColor;
    });

    it("overrides accent color keys that use default accent", () => {
      activeTheme = di.inject(activeThemeInjectable);
      const theme = activeTheme.get();

      expect(theme.colors.blue).toBe(customColor);
      expect(theme.colors.primary).toBe(customColor);
      expect(theme.colors.buttonPrimaryBackground).toBe(customColor);
      expect(theme.colors.menuActiveBackground).toBe(customColor);
      expect(theme.colors.helmStableRepo).toBe(customColor);
      expect(theme.colors.colorInfo).toBe(customColor);
      expect(theme.colors.sidebarSubmenuActiveColor).toBe(customColor);
    });

    it("does not override colors that do not use default accent", () => {
      activeTheme = di.inject(activeThemeInjectable);
      const theme = activeTheme.get();

      expect(theme.colors.magenta).toBe("#c93dce");
      expect(theme.colors.golden).toBe("#ffc63d");
      expect(theme.colors.colorError).toBe("#ce3933");
      expect(theme.colors.colorWarning).toBe("#ff9800");
    });

    it("sets sidebar active color to white for dark themes", () => {
      activeTheme = di.inject(activeThemeInjectable);
      const theme = activeTheme.get();

      expect(theme.colors.sidebarActiveColor).toBe("#ffffff");
    });

    it("sets sidebar active color to dark for light themes", () => {
      mockDarkTheme = createMockTheme({ name: "Light", type: "light" });
      di.override(defaultLensThemeInjectable, () => mockDarkTheme);
      activeTheme = di.inject(activeThemeInjectable);

      const theme = activeTheme.get();

      expect(theme.colors.sidebarActiveColor).toBe("#1e2124");
    });

    it("preserves other theme properties", () => {
      activeTheme = di.inject(activeThemeInjectable);
      const theme = activeTheme.get();

      expect(theme.name).toBe("Dark");
      expect(theme.type).toBe("dark");
      expect(theme.description).toBe("Test theme");
    });
  });

  describe("when theme colors do not use default accent", () => {
    beforeEach(() => {
      mockCustomAccentColor = "#ff0000";
      mockDarkTheme = createMockTheme({
        colors: {
          ...createMockTheme().colors,
          blue: "#custom-blue",
          primary: "#custom-primary",
        },
      });
      di.override(defaultLensThemeInjectable, () => mockDarkTheme);
      activeTheme = di.inject(activeThemeInjectable);
    });

    it("does not override colors that differ from default accent", () => {
      const theme = activeTheme.get();

      expect(theme.colors.blue).toBe("#custom-blue");
      expect(theme.colors.primary).toBe("#custom-primary");
    });
  });

  describe("with system theme preference", () => {
    beforeEach(() => {
      mockColorThemePreference = { useSystemTheme: true, lensThemeId: "" };
      mockCustomAccentColor = "#2196f3";
    });

    it("applies accent color to system-matched dark theme", () => {
      mockSystemThemeType = "dark";
      activeTheme = di.inject(activeThemeInjectable);

      const theme = activeTheme.get();

      expect(theme.colors.primary).toBe("#2196f3");
      expect(theme.type).toBe("dark");
    });
  });
});
