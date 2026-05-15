/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import activeThemeInjectable from "../../../../../../renderer/themes/active.injectable";
import applyLensThemeInjectable from "../../../../../../renderer/themes/apply-lens-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { IComputedValue } from "mobx";
import type { ApplyLensTheme } from "../../../../../../renderer/themes/apply-lens-theme.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  activeTheme: IComputedValue<LensTheme>;
  state: UserPreferencesState;
  applyLensTheme: ApplyLensTheme;
}

const colorGroupLabels: Record<string, string> = {
  blue: "Primary Colors",
  primary: "Text Colors",
  mainBackground: "Background Colors",
  sidebarBackground: "Sidebar Colors",
  layoutBackground: "Layout Colors",
  buttonPrimaryBackground: "Button Colors",
  tableBgcStripe: "Table Colors",
  helmLogoBackground: "Helm Colors",
  colorSuccess: "Status Colors",
  dockHeadBackground: "Dock Colors",
  logsBackground: "Log Colors",
  dialogTextColor: "Dialog Colors",
  drawerTogglerBackground: "Drawer Colors",
  clusterMenuBackground: "Cluster Colors",
  chartLiveBarBackground: "Chart Colors",
  inputControlBackground: "Input Colors",
  tooltipBackground: "Misc Colors",
};

const colorNames = [
  "blue", "magenta", "golden", "halfGray",
  "primary",
  "textColorPrimary", "textColorSecondary", "textColorTertiary", "textColorAccent", "textColorDimmed",
  "borderColor", "borderFaintColor",
  "mainBackground", "secondaryBackground", "contentColor",
  "layoutBackground", "layoutTabsBackground", "layoutTabsActiveColor", "layoutTabsLineColor",
  "sidebarLogoBackground", "sidebarActiveColor", "sidebarSubmenuActiveColor", "sidebarBackground", "sidebarItemHoverBackground",
  "badgeBackgroundColor",
  "buttonPrimaryBackground", "buttonDefaultBackground", "buttonLightBackground", "buttonAccentBackground", "buttonDisabledBackground",
  "tableBgcStripe", "tableBgcSelected", "tableHeaderBackground", "tableHeaderColor", "tableSelectedRowColor",
  "helmLogoBackground", "helmStableRepo", "helmIncubatorRepo", "helmDescriptionHr",
  "helmDescriptionBlockquoteColor", "helmDescriptionBlockquoteBorder", "helmDescriptionBlockquoteBackground",
  "helmDescriptionHeaders", "helmDescriptionH6", "helmDescriptionTdBorder", "helmDescriptionTrBackground",
  "helmDescriptionCodeBackground", "helmDescriptionPreBackground", "helmDescriptionPreColor",
  "colorSuccess", "colorOk", "colorInfo", "colorError", "colorSoftError", "colorWarning", "colorVague", "colorTerminated",
  "dockHeadBackground", "dockInfoBackground", "dockInfoBorderColor", "dockEditorBackground",
  "dockEditorTag", "dockEditorKeyword", "dockEditorComment", "dockEditorActiveLineBackground",
  "dockBadgeBackground", "dockTabBorderColor", "dockTabActiveBackground",
  "logsBackground", "logsForeground", "logRowHoverBackground",
  "dialogTextColor", "dialogBackground", "dialogHeaderBackground", "dialogFooterBackground",
  "drawerTogglerBackground", "drawerTitleText", "drawerSubtitleBackground", "drawerItemNameColor", "drawerItemValueColor",
  "clusterMenuBackground", "clusterMenuBorderColor", "clusterMenuCellBackground", "clusterMenuCellOutline",
  "clusterSettingsBackground", "addClusterIconColor",
  "boxShadow", "iconActiveColor", "iconActiveBackground", "filterAreaBackground",
  "chartLiveBarBackground", "chartStripesColor", "chartCapacityColor", "pieChartDefaultColor",
  "inputOptionHoverColor", "inputControlBackground", "inputControlBorder", "inputControlHoverBorder",
  "lineProgressBackground", "radioActiveBackground", "menuActiveBackground", "menuSelectedOptionBgc",
  "canvasBackground", "scrollBarColor", "settingsBackground", "settingsColor",
  "navSelectedBackground", "navHoverColor", "hrColor", "tooltipBackground",
];

const NonInjectedCustomThemeColors = observer(({ activeTheme, state, applyLensTheme }: Dependencies) => {
  const theme = activeTheme.get();
  const customColors = state.customThemeColors ?? {};

  const handleColorChange = (colorName: string, value: string) => {
    const updated = { ...customColors, [colorName]: value };
    state.customThemeColors = updated;
    applyLensTheme(theme);
  };

  const handleResetColor = (colorName: string) => {
    const updated = { ...customColors };
    delete updated[colorName];
    state.customThemeColors = updated;
    applyLensTheme(theme);
  };

  const handleResetAll = () => {
    state.customThemeColors = {};
    applyLensTheme(theme);
  };

  return (
    <section id="custom-theme-colors">
      <SubTitle title="Custom Theme Colors" />
      <div style={{ marginBottom: 12, fontSize: 13, color: "var(--textColorSecondary)" }}>
        Customize individual theme colors. Changes apply immediately on top of the selected base theme.
      </div>

      <button
        type="button"
        onClick={handleResetAll}
        style={{
          marginBottom: 16,
          padding: "6px 16px",
          background: "var(--buttonDefaultBackground)",
          color: "var(--textColorPrimary)",
          border: "1px solid var(--borderColor)",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Reset All Custom Colors
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {colorNames.map((name) => {
          const currentValue = customColors[name] ?? theme.colors[name];
          const isCustom = name in customColors;

          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                borderRadius: 4,
                background: isCustom ? "var(--colorInfo)" + "18" : "transparent",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  backgroundColor: currentValue,
                  border: "1px solid var(--borderColor)",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: "0 0 180px", fontSize: 13, color: "var(--textColorPrimary)" }}>
                {name}
              </span>
              <input
                type="color"
                value={currentValue}
                onChange={(e) => handleColorChange(name, e.target.value)}
                style={{
                  width: 32,
                  height: 28,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleColorChange(name, e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: 100,
                  padding: "4px 8px",
                  background: "var(--inputControlBackground)",
                  color: "var(--textColorPrimary)",
                  border: "1px solid var(--inputControlBorder)",
                  borderRadius: 4,
                  fontSize: 13,
                  fontFamily: "monospace",
                }}
              />
              {isCustom && (
                <button
                  type="button"
                  onClick={() => handleResetColor(name)}
                  style={{
                    padding: "2px 8px",
                    background: "transparent",
                    color: "var(--colorError)",
                    border: "1px solid var(--colorError)",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});

export const CustomThemeColors = withInjectables<Dependencies>(
  NonInjectedCustomThemeColors,
  {
    getProps: (di) => ({
      activeTheme: di.inject(activeThemeInjectable),
      state: di.inject(userPreferencesStateInjectable),
      applyLensTheme: di.inject(applyLensThemeInjectable),
    }),
  },
);
