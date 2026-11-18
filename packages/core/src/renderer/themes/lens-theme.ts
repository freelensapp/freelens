/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

export type ThemeId = string;
export type LensThemeType = "dark" | "light";
/**
 * A theme in one of its variants, as the application applies it.
 */
export interface LensTheme {
  /**
   * The `metadata.name` of the theme file, `freelens` for the built-in theme. The same for both
   * variants: {@link LensTheme.type} tells dark from light.
   */
  name: string;
  /**
   * The variant in use.
   */
  type: LensThemeType;
  /**
   * Every color token: those of the theme file, the missing ones from the built-in theme, and the
   * accent color applied.
   */
  colors: Record<LensColorName, string>;
  terminalColors: Partial<Record<TerminalColorName, string>>;
  /**
   * `spec.description` of the theme file, empty when it has none.
   */
  description: string;
  /**
   * `spec.author` of the theme file, empty when it has none.
   */
  author: string;
  /**
   * The name the editor theme of this variant is registered under in Monaco, to pass to
   * `editor.create()` or `editor.setTheme()`.
   */
  monacoTheme: string;
  /**
   * `true` on both variants of the built-in theme.
   */
  isDefault?: boolean;
}

export type TerminalColorName =
  | "foreground"
  | "background"
  | "cursor"
  | "cursorAccent"
  | "selectionBackground"
  | "selectionForeground"
  | "selectionInactiveBackground"
  | "scrollbarSliderBackground"
  | "scrollbarSliderHoverBackground"
  | "scrollbarSliderActiveBackground"
  | "overviewRulerBorder"
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

export type LensColorName =
  | "blue"
  | "magenta"
  | "golden"
  | "halfGray"
  | "primary"
  | "textColorPrimary"
  | "textColorSecondary"
  | "textColorTertiary"
  | "textColorAccent"
  | "textColorDimmed"
  | "textColorOnPrimary"
  | "borderColor"
  | "borderFaintColor"
  | "mainBackground"
  | "secondaryBackground"
  | "contentColor"
  | "layoutBackground"
  | "layoutTabsBackground"
  | "layoutTabsActiveColor"
  | "layoutTabsLineColor"
  | "sidebarLogoBackground"
  | "sidebarActiveColor"
  | "sidebarSubmenuActiveColor"
  | "sidebarBackground"
  | "sidebarItemHoverBackground"
  | "badgeBackgroundColor"
  | "buttonPrimaryBackground"
  | "buttonDefaultBackground"
  | "buttonLightBackground"
  | "buttonAccentBackground"
  | "buttonDisabledBackground"
  | "tableBgcStripe"
  | "tableBgcSelected"
  | "tableHeaderBackground"
  | "tableHeaderColor"
  | "tableSelectedRowColor"
  | "helmLogoBackground"
  | "helmStableRepo"
  | "helmIncubatorRepo"
  | "helmDescriptionHr"
  | "helmDescriptionBlockquoteColor"
  | "helmDescriptionBlockquoteBorder"
  | "helmDescriptionBlockquoteBackground"
  | "helmDescriptionHeaders"
  | "helmDescriptionH6"
  | "helmDescriptionTdBorder"
  | "helmDescriptionTrBackground"
  | "helmDescriptionCodeBackground"
  | "helmDescriptionPreBackground"
  | "helmDescriptionPreColor"
  | "colorSuccess"
  | "colorOk"
  | "colorInfo"
  | "colorError"
  | "colorSoftError"
  | "colorWarning"
  | "colorVague"
  | "colorTerminated"
  | "dockHeadBackground"
  | "dockInfoBackground"
  | "dockInfoBorderColor"
  | "dockEditorBackground"
  | "dockEditorTag"
  | "dockEditorKeyword"
  | "dockEditorComment"
  | "dockEditorActiveLineBackground"
  | "dockBadgeBackground"
  | "dockTabBorderColor"
  | "dockTabActiveBackground"
  | "logsBackground"
  | "logsForeground"
  | "logRowHoverBackground"
  | "dialogTextColor"
  | "dialogBackground"
  | "dialogHeaderBackground"
  | "dialogFooterBackground"
  | "drawerTogglerBackground"
  | "drawerTitleText"
  | "drawerSubtitleBackground"
  | "drawerItemNameColor"
  | "drawerItemValueColor"
  | "clusterMenuBackground"
  | "clusterMenuBorderColor"
  | "clusterMenuCellBackground"
  | "clusterMenuCellOutline"
  | "clusterSettingsBackground"
  | "addClusterIconColor"
  | "boxShadow"
  | "iconActiveColor"
  | "iconActiveBackground"
  | "filterAreaBackground"
  | "chartLiveBarBackground"
  | "chartStripesColor"
  | "chartCapacityColor"
  | "pieChartDefaultColor"
  | "inputOptionHoverColor"
  | "inputControlBackground"
  | "inputControlBorder"
  | "inputControlHoverBorder"
  | "lineProgressBackground"
  | "radioActiveBackground"
  | "menuActiveBackground"
  | "menuSelectedOptionBgc"
  | "canvasBackground"
  | "scrollBarColor"
  | "settingsBackground"
  | "settingsColor"
  | "navSelectedBackground"
  | "navHoverColor"
  | "hrColor"
  | "tooltipBackground";
