/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { MonacoTheme } from "../../components/monaco-editor";
import type { LensColorName, LensTheme, LensThemeType, TerminalColorName } from "../lens-theme";

/**
 * The semantic design tokens a ProLens theme is written in. `createTheme`
 * derives every `LensColorName` from them, so a theme stays consistent across
 * the whole application without listing a hundred and forty colours.
 */
export interface ThemePalette {
  type: LensThemeType;
  /** Brand/accent colour: primary buttons, active items, links. */
  accent: string;
  /** Text on top of `accent`. */
  onAccent: string;
  /** Deepest surface: editor, logs, terminal frame. */
  canvas: string;
  /** Main content surface. */
  surface: string;
  /** Raised surface: headers, dialogs, tabs. */
  surfaceRaised: string;
  /** Navigation surface: sidebar, hotbar. */
  surfaceNav: string;
  /** Hover state of a surface. */
  surfaceHover: string;
  /** Selected/active state of a surface. */
  surfaceActive: string;
  border: string;
  borderFaint: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  /** Headings, selected and active text. */
  textStrong: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  magenta: string;
  golden: string;
  shadow: string;
  scrollbar: string;
  monacoTheme: MonacoTheme;
  terminal: Partial<Record<TerminalColorName, string>>;
}

const expandHex = (hex: string) => {
  const value = hex.replace("#", "");

  if (value.length === 3 || value.length === 4) {
    return value
      .split("")
      .map((char) => char + char)
      .join("");
  }

  return value;
};

/**
 * Returns `hex` with an alpha channel, `alpha` from 0 to 1. Colours that are
 * not hex are returned unchanged.
 */
export const withAlpha = (hex: string, alpha: number) => {
  if (!hex.startsWith("#")) {
    return hex;
  }

  const rgb = expandHex(hex).slice(0, 6);
  const channel = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rgb}${channel}`;
};

const parseRgb = (hex: string): [number, number, number] | undefined => {
  if (!hex.startsWith("#")) {
    return undefined;
  }

  const value = expandHex(hex).slice(0, 6);

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return undefined;
  }

  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
};

/**
 * WCAG relative luminance of a hex colour, 0 (black) to 1 (white).
 */
export const relativeLuminance = (hex: string) => {
  const rgb = parseRgb(hex);

  if (!rgb) {
    return 0;
  }

  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Black or white, whichever reads better on `background`.
 */
export const readableTextOn = (background: string) => (relativeLuminance(background) > 0.45 ? "#0b0d12" : "#ffffff");

/**
 * Tokens that follow the accent colour. Overriding the accent replaces
 * exactly these.
 */
export const accentColorNames = [
  "blue",
  "primary",
  "buttonPrimaryBackground",
  "colorInfo",
  "menuActiveBackground",
  "helmStableRepo",
  "radioActiveBackground",
] as const satisfies readonly LensColorName[];

export const accentColors = (
  accent: string,
): Pick<Record<LensColorName, string>, (typeof accentColorNames)[number]> => ({
  blue: accent,
  primary: accent,
  buttonPrimaryBackground: accent,
  colorInfo: accent,
  menuActiveBackground: accent,
  helmStableRepo: accent,
  radioActiveBackground: accent,
});

export const paletteToColors = (p: ThemePalette): Record<LensColorName, string> => {
  const isDark = p.type === "dark";

  return {
    ...accentColors(p.accent),
    magenta: p.magenta,
    golden: p.golden,
    halfGray: withAlpha(p.textMuted, 0.5),
    textColorPrimary: p.text,
    textColorSecondary: p.textSecondary,
    textColorTertiary: p.textMuted,
    textColorAccent: p.textStrong,
    textColorDimmed: withAlpha(p.textMuted, 0.75),
    borderColor: p.border,
    borderFaintColor: p.borderFaint,
    mainBackground: p.surface,
    secondaryBackground: p.surfaceRaised,
    contentColor: p.surfaceRaised,
    layoutBackground: p.surface,
    layoutTabsBackground: p.surfaceRaised,
    layoutTabsActiveColor: p.textStrong,
    layoutTabsLineColor: p.border,
    sidebarLogoBackground: p.surfaceRaised,
    sidebarActiveColor: p.textStrong,
    sidebarSubmenuActiveColor: p.textStrong,
    sidebarBackground: p.surfaceNav,
    sidebarItemHoverBackground: p.surfaceHover,
    badgeBackgroundColor: p.golden,
    buttonDefaultBackground: p.surfaceActive,
    buttonLightBackground: isDark ? "#f1f3f5" : p.surfaceRaised,
    buttonAccentBackground: p.error,
    buttonDisabledBackground: withAlpha(p.textMuted, 0.4),
    tableBgcStripe: isDark ? withAlpha("#ffffff", 0.02) : withAlpha("#000000", 0.02),
    tableBgcSelected: withAlpha(p.accent, isDark ? 0.18 : 0.12),
    tableHeaderBackground: p.surfaceRaised,
    tableHeaderColor: p.textStrong,
    tableSelectedRowColor: p.textStrong,
    helmLogoBackground: "#ffffff",
    helmIncubatorRepo: p.warning,
    helmDescriptionHr: p.border,
    helmDescriptionBlockquoteColor: p.textSecondary,
    helmDescriptionBlockquoteBorder: p.border,
    helmDescriptionBlockquoteBackground: p.surfaceRaised,
    helmDescriptionHeaders: p.border,
    helmDescriptionH6: p.textMuted,
    helmDescriptionTdBorder: p.border,
    helmDescriptionTrBackground: p.surface,
    helmDescriptionCodeBackground: withAlpha(p.text, 0.1),
    helmDescriptionPreBackground: p.canvas,
    helmDescriptionPreColor: p.text,
    colorSuccess: p.success,
    colorOk: p.success,
    colorError: p.error,
    colorSoftError: withAlpha(p.error, 0.85),
    colorWarning: p.warning,
    colorVague: p.surfaceActive,
    colorTerminated: p.textMuted,
    dockHeadBackground: p.surfaceRaised,
    dockInfoBackground: p.surface,
    dockInfoBorderColor: p.borderFaint,
    dockEditorBackground: p.canvas,
    dockEditorTag: p.textSecondary,
    dockEditorKeyword: p.textStrong,
    dockEditorComment: p.textMuted,
    dockEditorActiveLineBackground: p.surfaceHover,
    dockBadgeBackground: p.surfaceActive,
    dockTabBorderColor: p.border,
    dockTabActiveBackground: p.surfaceActive,
    logsBackground: p.canvas,
    logsForeground: p.text,
    logRowHoverBackground: p.surfaceHover,
    dialogTextColor: p.textSecondary,
    dialogBackground: p.surfaceRaised,
    dialogHeaderBackground: p.surfaceNav,
    dialogFooterBackground: p.surface,
    drawerTogglerBackground: p.surfaceActive,
    drawerTitleText: p.textStrong,
    drawerSubtitleBackground: p.surfaceRaised,
    drawerItemNameColor: p.textMuted,
    drawerItemValueColor: p.text,
    clusterMenuBackground: p.canvas,
    clusterMenuBorderColor: p.borderFaint,
    clusterMenuCellBackground: p.surfaceRaised,
    clusterMenuCellOutline: withAlpha(p.accent, 0.6),
    clusterSettingsBackground: p.surface,
    addClusterIconColor: p.canvas,
    boxShadow: p.shadow,
    iconActiveColor: p.textStrong,
    iconActiveBackground: withAlpha(p.textStrong, 0.1),
    filterAreaBackground: p.surface,
    chartLiveBarBackground: withAlpha("#000000", isDark ? 0.2 : 0.08),
    chartStripesColor: withAlpha(p.text, 0.04),
    chartCapacityColor: p.border,
    pieChartDefaultColor: p.surfaceActive,
    inputOptionHoverColor: p.textStrong,
    inputControlBackground: p.canvas,
    inputControlBorder: p.border,
    inputControlHoverBorder: withAlpha(p.accent, 0.7),
    lineProgressBackground: p.surfaceActive,
    menuSelectedOptionBgc: p.surfaceActive,
    canvasBackground: p.canvas,
    scrollBarColor: p.scrollbar,
    settingsBackground: p.surface,
    settingsColor: p.textSecondary,
    navSelectedBackground: p.surfaceActive,
    navHoverColor: p.textStrong,
    hrColor: p.borderFaint,
    tooltipBackground: isDark ? p.canvas : "#1f2328",
  };
};

export interface CreateThemeOptions {
  name: string;
  description: string;
  author?: string;
  isDefault?: boolean;
  palette: ThemePalette;
}

export const createTheme = ({
  name,
  description,
  author = "ProLens",
  isDefault,
  palette,
}: CreateThemeOptions): LensTheme => ({
  name,
  type: palette.type,
  description,
  author,
  monacoTheme: palette.monacoTheme,
  colors: paletteToColors(palette),
  terminalColors: {
    background: palette.canvas,
    foreground: palette.text,
    cursor: palette.accent,
    cursorAccent: palette.canvas,
    selectionBackground: withAlpha(palette.accent, 0.35),
    selectionInactiveBackground: withAlpha(palette.accent, 0.2),
    ...palette.terminal,
  },
  ...(isDefault ? { isDefault } : {}),
});

/**
 * The active theme with the user's accent colour applied, or the theme as it
 * is when there is no override.
 */
export const withAccentColor = <T extends Pick<LensTheme, "colors" | "terminalColors">>(
  theme: T,
  accent: string | undefined,
): T => {
  if (!accent) {
    return theme;
  }

  return {
    ...theme,
    colors: {
      ...theme.colors,
      ...accentColors(accent),
      tableBgcSelected: withAlpha(accent, 0.18),
      inputControlHoverBorder: withAlpha(accent, 0.7),
      clusterMenuCellOutline: withAlpha(accent, 0.6),
    },
    terminalColors: {
      ...theme.terminalColors,
      cursor: accent,
    },
  };
};
