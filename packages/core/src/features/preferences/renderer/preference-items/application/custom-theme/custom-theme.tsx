/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Button } from "../../../../../../renderer/components/button";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import customThemesInjectable from "../../../../../user-preferences/common/custom-themes.injectable";
import activeThemeInjectable from "../../../../../../renderer/themes/active.injectable";
import lensThemesInjectable from "../../../../../../renderer/themes/themes.injectable";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  customThemes: Record<string, LensTheme>;
  activeTheme: LensTheme;
  allThemes: Map<string, LensTheme>;
}

const NonInjectedCustomThemeEditor = observer(({ state, customThemes, activeTheme, allThemes }: Dependencies) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [editingTheme, setEditingTheme] = useState<Partial<LensTheme> | null>(null);

  const customThemeEntries = Object.entries(customThemes);

  const handleCreateNew = () => {
    const newId = `custom-${Date.now()}`;
    const newTheme: Partial<LensTheme> = {
      name: "My Custom Theme",
      type: activeTheme.type,
      colors: { ...activeTheme.colors },
      terminalColors: { ...activeTheme.terminalColors },
      description: "Custom theme created by user",
      author: "User",
      monacoTheme: activeTheme.monacoTheme,
    };
    setEditingTheme(newTheme);
    setSelectedThemeId(newId);
  };

  const handleEdit = (themeId: string) => {
    setSelectedThemeId(themeId);
    setEditingTheme(customThemes[themeId]);
  };

  const handleSave = () => {
    if (!editingTheme || !selectedThemeId) return;

    const updatedCustomThemes = {
      ...customThemes,
      [selectedThemeId]: {
        ...editingTheme,
        name: editingTheme.name || "Unnamed Theme",
      } as LensTheme,
    };

    state.customThemes = updatedCustomThemes;
    setEditingTheme(null);
    setSelectedThemeId(null);
  };

  const handleDelete = (themeId: string) => {
    const updatedCustomThemes = { ...customThemes };
    delete updatedCustomThemes[themeId];
    state.customThemes = updatedCustomThemes;
  };

  const handleColorChange = (colorName: keyof LensTheme["colors"], value: string) => {
    if (!editingTheme) return;
    setEditingTheme({
      ...editingTheme,
      colors: {
        ...editingTheme.colors,
        [colorName]: value,
      },
    });
  };

  if (editingTheme) {
    return (
      <section id="custom-theme-editor">
        <SubTitle title="Edit Custom Theme" />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <label>
              Name:
              <input
                type="text"
                value={editingTheme.name || ""}
                onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                style={{ marginLeft: "8px" }}
              />
            </label>
            <label>
              Type:
              <select
                value={editingTheme.type || "dark"}
                onChange={(e) => setEditingTheme({ ...editingTheme, type: e.target.value as "dark" | "light" })}
                style={{ marginLeft: "8px" }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>
          <label>
            Description:
            <textarea
              value={editingTheme.description || ""}
              onChange={(e) => setEditingTheme({ ...editingTheme, description: e.target.value })}
              style={{ marginLeft: "8px", width: "400px", height: "60px" }}
            />
          </label>
          <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc", padding: "12px" }}>
            {Object.entries(editingTheme.colors || {}).map(([colorName, colorValue]) => (
              <div key={colorName} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ width: "200px", fontSize: "12px" }}>{colorName}:</label>
                <input
                  type="color"
                  value={colorValue || "#000000"}
                  onChange={(e) => handleColorChange(colorName as keyof LensTheme["colors"], e.target.value)}
                  style={{ width: "50px", height: "30px" }}
                />
                <input
                  type="text"
                  value={colorValue || ""}
                  onChange={(e) => handleColorChange(colorName as keyof LensTheme["colors"], e.target.value)}
                  style={{ marginLeft: "8px", width: "120px", fontSize: "12px" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button onClick={handleSave}>Save Theme</Button>
            <Button onClick={() => { setEditingTheme(null); setSelectedThemeId(null); }}>Cancel</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="custom-themes">
      <SubTitle title="Custom Themes" />
      <Button onClick={handleCreateNew}>Create New Theme</Button>
      {customThemeEntries.length === 0 ? (
        <p style={{ marginTop: "16px", color: "#888" }}>No custom themes yet</p>
      ) : (
        <div style={{ marginTop: "16px" }}>
          {customThemeEntries.map(([themeId, theme]) => (
            <div key={themeId} style={{ 
              padding: "12px", 
              border: "1px solid #ccc", 
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <strong>{theme.name}</strong>
                <span style={{ marginLeft: "12px", fontSize: "12px", color: "#888" }}>
                  {theme.type}
                </span>
                {theme.description && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
                    {theme.description}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button onClick={() => handleEdit(themeId)}>Edit</Button>
                <Button onClick={() => handleDelete(themeId)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

export const CustomThemeEditor = withInjectables<Dependencies>(NonInjectedCustomThemeEditor, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    customThemes: di.inject(customThemesInjectable),
    activeTheme: di.inject(activeThemeInjectable),
    allThemes: di.inject(lensThemesInjectable),
  }),
});