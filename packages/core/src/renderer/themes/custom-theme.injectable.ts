/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { lensThemeDeclarationInjectionToken } from "./declaration";
import userPreferencesStateInjectable from "../../../features/user-preferences/common/state.injectable";

import type { LensTheme } from "./lens-theme";

const customThemeInjectable = getInjectable({
  id: "custom-theme",
  instantiate: (di) => {
    const userPreferences = di.inject(userPreferencesStateInjectable);
    
    // Get custom colors from user preferences
    const customColors = userPreferences.customThemeColors || {};
    const baseTheme = userPreferences.customThemeBase || "dark";
    
    // Base theme colors (dark or light)
    const baseColors = baseTheme === "light" 
      ? getLightBaseColors() 
      : getDarkBaseColors();
    
    // Merge custom colors with base colors
    const mergedColors = { ...baseColors, ...customColors };
    
    const theme: LensTheme = {
      name: "Custom",
      type: baseTheme as "dark" | "light",
      description: "User customized theme",
      author: "User",
      monacoTheme: baseTheme === "light" ? "vs" : "clouds-midnight",
      colors: mergedColors,
      terminalColors: {},
      isDefault: false,
    };

    return theme;
  },
  
  injectionToken: lensThemeDeclarationInjectionToken,
});

function getDarkBaseColors() {
  return {
    blue: "#00a7a0",
    magenta: "#c93dce",
    golden: "#ffc63d",
    halfGray: "#87909c80",
    primary: "#00a7a0",
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
    sidebarSubmenuActiveColor: "#ffffff",
    sidebarItemHoverBackground: "#3a3e44",
    badgeBackgroundColor: "#ffba44",
    buttonPrimaryBackground: "#00a7a0",
    buttonDefaultBackground: "#414448",
    buttonLightBackground: "#f1f1f1",
    buttonAccentBackground: "#e85555",
    buttonDisabledBackground: "#5e6165",
    tableBgcStripe: "#2c3135",
    tableBgcSelected: "#2c3e50",
    tableHeaderBackground: "#36393e",
    tableHeaderColor: "#8e9297",
    tableSelectedRowColor: "#ffffff",
    helmLogoBackground: "#ffffff",
    helmStableRepo: "#00a7a0",
    helmIncubatorRepo: "#ffc63d",
    helmDescriptionHr: "#4c5053",
    helmDescriptionBlockquoteColor: "#8e9297",
    helmDescriptionBlockquoteBackground: "#2e3136",
    helmDescriptionBlockquoteBorder: "#4c5053",
    helmDescriptionH1: "#ffffff",
    helmDescriptionH2: "#ffffff",
    helmDescriptionH3: "#ffffff",
    helmDescriptionH4: "#ffffff",
    helmDescriptionH5: "#ffffff",
    helmDescriptionH6: "#ffffff",
    helmDescriptionParagraph: "#8e9297",
    helmDescriptionListItem: "#8e9297",
    helmDescriptionLink: "#00a7a0",
    helmDescriptionLinkHover: "#00c4bc",
    helmDescriptionCode: "#00a7a0",
    helmDescriptionCodeBackground: "#2e3136",
    helmDescriptionPre: "#8e9297",
    helmDescriptionPreBackground: "#2e3136",
    helmDescriptionTableBorder: "#4c5053",
    helmDescriptionTableBackground: "#2e3136",
    helmDescriptionTableRowEven: "#36393e",
    helmDescriptionTableRowOdd: "#2e3136",
    helmDescriptionTableHeader: "#36393e",
    helmDescriptionTableHeaderColor: "#ffffff",
    helmDescriptionTableCell: "#8e9297",
  };
}

function getLightBaseColors() {
  return {
    blue: "#00a7a0",
    magenta: "#c93dce",
    golden: "#ffc63d",
    halfGray: "#87909c80",
    primary: "#00a7a0",
    textColorPrimary: "#555555",
    textColorSecondary: "#51575d",
    textColorTertiary: "#555555",
    textColorAccent: "#222222",
    textColorDimmed: "#5557598c",
    borderColor: "#c9cfd3",
    borderFaintColor: "#dfdfdf",
    mainBackground: "#f1f1f1",
    secondaryBackground: "#f2f3f5",
    contentColor: "#ffffff",
    layoutBackground: "#e8e8e8",
    layoutTabsBackground: "#f8f8f8",
    layoutTabsActiveColor: "#333333",
    layoutTabsLineColor: "#87909c80",
    sidebarBackground: "#e8e8e8",
    sidebarLogoBackground: "#f1f1f1",
    sidebarActiveColor: "#ffffff",
    sidebarSubmenuActiveColor: "#00a7a0",
    sidebarItemHoverBackground: "#f0f2f5",
    badgeBackgroundColor: "#ffba44",
    buttonPrimaryBackground: "#00a7a0",
    buttonDefaultBackground: "#414448",
    buttonLightBackground: "#f1f1f1",
    buttonAccentBackground: "#e85555",
    buttonDisabledBackground: "#c9cfd3",
    tableBgcStripe: "#f8f8f8",
    tableBgcSelected: "#e3f2fd",
    tableHeaderBackground: "#e8e8e8",
    tableHeaderColor: "#555555",
    tableSelectedRowColor: "#333333",
    helmLogoBackground: "#ffffff",
    helmStableRepo: "#00a7a0",
    helmIncubatorRepo: "#ffc63d",
    helmDescriptionHr: "#c9cfd3",
    helmDescriptionBlockquoteColor: "#555555",
    helmDescriptionBlockquoteBackground: "#f1f1f1",
    helmDescriptionBlockquoteBorder: "#c9cfd3",
    helmDescriptionH1: "#222222",
    helmDescriptionH2: "#222222",
    helmDescriptionH3: "#222222",
    helmDescriptionH4: "#222222",
    helmDescriptionH5: "#222222",
    helmDescriptionH6: "#222222",
    helmDescriptionParagraph: "#555555",
    helmDescriptionListItem: "#555555",
    helmDescriptionLink: "#00a7a0",
    helmDescriptionLinkHover: "#00c4bc",
    helmDescriptionCode: "#00a7a0",
    helmDescriptionCodeBackground: "#f1f1f1",
    helmDescriptionPre: "#555555",
    helmDescriptionPreBackground: "#f1f1f1",
    helmDescriptionTableBorder: "#c9cfd3",
    helmDescriptionTableBackground: "#ffffff",
    helmDescriptionTableRowEven: "#f8f8f8",
    helmDescriptionTableRowOdd: "#ffffff",
    helmDescriptionTableHeader: "#e8e8e8",
    helmDescriptionTableHeaderColor: "#555555",
    helmDescriptionTableCell: "#555555",
  };
}

export default customThemeInjectable;
