/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { normalizeCustomThemeColors } from "../../features/user-preferences/common/custom-theme-colors";

import type { ReadonlyDeep } from "type-fest";

import type { CustomThemeColors } from "../../features/user-preferences/common/custom-theme-colors";
import type { LensColorName, LensTheme } from "./lens-theme";

export const lensColorNames = [
  "blue",
  "magenta",
  "golden",
  "halfGray",
  "primary",
  "textColorPrimary",
  "textColorSecondary",
  "textColorTertiary",
  "textColorAccent",
  "textColorDimmed",
  "borderColor",
  "borderFaintColor",
  "mainBackground",
  "secondaryBackground",
  "contentColor",
  "layoutBackground",
  "layoutTabsBackground",
  "layoutTabsActiveColor",
  "layoutTabsLineColor",
  "sidebarLogoBackground",
  "sidebarActiveColor",
  "sidebarSubmenuActiveColor",
  "sidebarBackground",
  "sidebarItemHoverBackground",
  "badgeBackgroundColor",
  "buttonPrimaryBackground",
  "buttonDefaultBackground",
  "buttonLightBackground",
  "buttonAccentBackground",
  "buttonDisabledBackground",
  "tableBgcStripe",
  "tableBgcSelected",
  "tableHeaderBackground",
  "tableHeaderColor",
  "tableSelectedRowColor",
  "helmLogoBackground",
  "helmStableRepo",
  "helmIncubatorRepo",
  "helmDescriptionHr",
  "helmDescriptionBlockquoteColor",
  "helmDescriptionBlockquoteBorder",
  "helmDescriptionBlockquoteBackground",
  "helmDescriptionHeaders",
  "helmDescriptionH6",
  "helmDescriptionTdBorder",
  "helmDescriptionTrBackground",
  "helmDescriptionCodeBackground",
  "helmDescriptionPreBackground",
  "helmDescriptionPreColor",
  "colorSuccess",
  "colorOk",
  "colorInfo",
  "colorError",
  "colorSoftError",
  "colorWarning",
  "colorVague",
  "colorTerminated",
  "dockHeadBackground",
  "dockInfoBackground",
  "dockInfoBorderColor",
  "dockEditorBackground",
  "dockEditorTag",
  "dockEditorKeyword",
  "dockEditorComment",
  "dockEditorActiveLineBackground",
  "dockBadgeBackground",
  "dockTabBorderColor",
  "dockTabActiveBackground",
  "logsBackground",
  "logsForeground",
  "logRowHoverBackground",
  "dialogTextColor",
  "dialogBackground",
  "dialogHeaderBackground",
  "dialogFooterBackground",
  "drawerTogglerBackground",
  "drawerTitleText",
  "drawerSubtitleBackground",
  "drawerItemNameColor",
  "drawerItemValueColor",
  "clusterMenuBackground",
  "clusterMenuBorderColor",
  "clusterMenuCellBackground",
  "clusterMenuCellOutline",
  "clusterSettingsBackground",
  "addClusterIconColor",
  "boxShadow",
  "iconActiveColor",
  "iconActiveBackground",
  "filterAreaBackground",
  "chartLiveBarBackground",
  "chartStripesColor",
  "chartCapacityColor",
  "pieChartDefaultColor",
  "inputOptionHoverColor",
  "inputControlBackground",
  "inputControlBorder",
  "inputControlHoverBorder",
  "lineProgressBackground",
  "radioActiveBackground",
  "menuActiveBackground",
  "menuSelectedOptionBgc",
  "canvasBackground",
  "scrollBarColor",
  "settingsBackground",
  "settingsColor",
  "navSelectedBackground",
  "navHoverColor",
  "hrColor",
  "tooltipBackground",
] as const satisfies LensColorName[];

const lensColorNameSet = new Set<string>(lensColorNames);

export const isLensColorName = (value: string): value is LensColorName => lensColorNameSet.has(value);

export const getCustomThemeColors = (
  customThemeColors: CustomThemeColors | undefined,
): Partial<Record<LensColorName, string>> => {
  const normalizedColors = normalizeCustomThemeColors(customThemeColors);

  if (!normalizedColors) {
    return {};
  }

  const colors: Partial<Record<LensColorName, string>> = {};

  for (const [name, color] of Object.entries(normalizedColors)) {
    if (isLensColorName(name)) {
      colors[name] = color;
    }
  }

  return colors;
};

export const withCustomThemeColors = (
  theme: ReadonlyDeep<LensTheme>,
  customThemeColors: CustomThemeColors | undefined,
): ReadonlyDeep<LensTheme> | LensTheme => {
  const colors = getCustomThemeColors(customThemeColors);

  if (Object.keys(colors).length === 0) {
    return theme;
  }

  return {
    ...theme,
    colors: {
      ...theme.colors,
      ...colors,
    },
  };
};
