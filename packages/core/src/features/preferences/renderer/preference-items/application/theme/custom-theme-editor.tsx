/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Input } from "../../../../../../renderer/components/input";
import { Button } from "../../../../../../renderer/components/button";
import { Select } from "../../../../../../renderer/components/select";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { defaultThemeInjectable } from "../../../../../../renderer/themes/default-theme.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";

interface Dependencies {
  state: UserPreferencesState;
  defaultTheme: LensTheme;
}

// Common theme colors that users might want to customize
const customizableColors = [
  { key: "primary", label: "Primary Color", description: "Main accent color" },
  { key: "mainBackground", label: "Main Background", description: "Application background" },
  { key: "sidebarBackground", label: "Sidebar Background", description: "Left sidebar background" },
  { key: "textColorPrimary", label: "Primary Text", description: "Main text color" },
  { key: "textColorSecondary", label: "Secondary Text", description: "Secondary text color" },
  { key: "borderColor", label: "Border Color", description: "Border and divider color" },
  { key: "buttonPrimaryBackground", label: "Primary Button", description: "Primary button background" },
  { key: "contentColor", label: "Content Background", description: "Content area background" },
  { key: "layoutBackground", label: "Layout Background", description: "Layout background" },
  { key: "sidebarActiveColor", label: "Active Sidebar Item", description: "Active sidebar item color" },
];

const NonInjectedCustomThemeEditor = observer(({ state, defaultTheme }: Dependencies) => {
  const [selectedBase, setSelectedBase] = useState<"dark" | "light">(
    state.customThemeBase || "dark"
  );
  
  const [customColors, setCustomColors] = useState<Record<string, string>>(
    state.customThemeColors || {}
  );

  const baseThemeOptions = [
    { value: "dark", label: "Dark Theme" },
    { value: "light", label: "Light Theme" },
  ];

  const handleColorChange = (colorKey: string, value: string) => {
    setCustomColors((prev) => ({
      ...prev,
      [colorKey]: value,
    }));
  };

  const handleSave = () => {
    state.customThemeColors = customColors;
    state.customThemeBase = selectedBase;
    state.colorTheme = "Custom";
  };

  const handleReset = () => {
    setCustomColors({});
    setSelectedBase("dark");
    state.customThemeColors = {};
    state.customThemeBase = "dark";
  };

  const handleBaseChange = (option: { value: string; label: string } | null) => {
    if (option) {
      setSelectedBase(option.value as "dark" | "light");
    }
  };

  return (
    <section id="custom-theme-editor">
      <SubTitle title="Custom Theme" />
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
          Base Theme
        </label>
        <Select
          id="base-theme-select"
          options={baseThemeOptions}
          value={selectedBase}
          onChange={handleBaseChange}
          themeName="lens"
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
          Custom Colors
        </label>
        
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {customizableColors.map(({ key, label, description }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                  {label}
                </label>
                <span style={{ fontSize: "12px", color: "#888" }}>{description}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="color"
                  value={customColors[key] || getDefaultColor(key, selectedBase)}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
                <Input
                  value={customColors[key] || getDefaultColor(key, selectedBase)}
                  onChange={(value) => handleColorChange(key, value)}
                  placeholder="#00a7a0"
                  style={{ width: "100px" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <Button variant="primary" onClick={handleSave}>
          Apply Custom Theme
        </Button>
        <Button variant="default" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>

      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          borderRadius: "8px",
          backgroundColor: customColors.mainBackground || getDefaultColor("mainBackground", selectedBase),
          border: `1px solid ${customColors.borderColor || getDefaultColor("borderColor", selectedBase)}`,
        }}
      >
        <h4
          style={{
            color: customColors.textColorPrimary || getDefaultColor("textColorPrimary", selectedBase),
            marginBottom: "12px",
          }}
        >
          Preview
        </h4>
        <p
          style={{
            color: customColors.textColorSecondary || getDefaultColor("textColorSecondary", selectedBase),
          }}
        >
          This is how your custom theme will look. The colors will be applied to the entire application.
        </p>
        <Button
          variant="primary"
          style={{
            marginTop: "12px",
            backgroundColor: customColors.buttonPrimaryBackground || getDefaultColor("buttonPrimaryBackground", selectedBase),
          }}
        >
          Sample Button
        </Button>
      </div>
    </section>
  );
});

function getDefaultColor(key: string, base: "dark" | "light"): string {
  const darkDefaults: Record<string, string> = {
    primary: "#00a7a0",
    mainBackground: "#1e2124",
    sidebarBackground: "#36393e",
    textColorPrimary: "#8e9297",
    textColorSecondary: "#a0a0a0",
    borderColor: "#4c5053",
    buttonPrimaryBackground: "#00a7a0",
    contentColor: "#262b2f",
    layoutBackground: "#2e3136",
    sidebarActiveColor: "#ffffff",
  };

  const lightDefaults: Record<string, string> = {
    primary: "#00a7a0",
    mainBackground: "#f1f1f1",
    sidebarBackground: "#e8e8e8",
    textColorPrimary: "#555555",
    textColorSecondary: "#51575d",
    borderColor: "#c9cfd3",
    buttonPrimaryBackground: "#00a7a0",
    contentColor: "#ffffff",
    layoutBackground: "#e8e8e8",
    sidebarActiveColor: "#ffffff",
  };

  const defaults = base === "light" ? lightDefaults : darkDefaults;
  return defaults[key] || "#000000";
}

export const CustomThemeEditor = withInjectables(NonInjectedCustomThemeEditor)({
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultTheme: di.inject(defaultThemeInjectable),
  }),
});

export default CustomThemeEditor;
