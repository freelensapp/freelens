/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Button } from "@freelensapp/button";
import customThemesInjectable from "../../../../../user-preferences/common/custom-themes.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import lensDarkThemeInjectable from "../../../../../../renderer/themes/lens-dark.injectable";

import type { CustomThemesState, CustomTheme } from "../../../../../user-preferences/common/custom-themes.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";

interface Dependencies {
  customThemesState: CustomThemesState;
  userState: UserPreferencesState;
  defaultDarkTheme: LensTheme;
}

interface ThemeEditorProps {
  theme?: CustomTheme;
  onSave: (theme: Partial<CustomTheme>) => void;
  onCancel: () => void;
  defaultDarkTheme: LensTheme;
}

const ThemeEditor = observer(({ theme, onSave, onCancel, defaultDarkTheme }: ThemeEditorProps) => {
  const [name, setName] = useState(theme?.name || "");
  const [description, setDescription] = useState(theme?.description || "");
  const [type, setType] = useState<LensTheme["type"]>(theme?.type || "dark");
  const [primaryColor, setPrimaryColor] = useState(theme?.colors?.primary || defaultDarkTheme.colors.primary);
  const [backgroundColor, setBackgroundColor] = useState(theme?.colors?.mainBackground || defaultDarkTheme.colors.mainBackground);
  const [textColor, setTextColor] = useState(theme?.colors?.textColorPrimary || defaultDarkTheme.colors.textColorPrimary);

  const handleSave = () => {
    const baseTheme = defaultDarkTheme;
    const newTheme: Partial<CustomTheme> = {
      name,
      description,
      type,
      author: "Custom",
      monacoTheme: type === "dark" ? "clouds-midnight" : "vs",
      colors: {
        ...baseTheme.colors,
        primary: primaryColor,
        mainBackground: backgroundColor,
        textColorPrimary: textColor,
      },
      terminalColors: baseTheme.terminalColors,
    };
    onSave(newTheme);
  };

  return (
    <div className="theme-editor" style={{ padding: "16px", border: "1px solid var(--borderColor)", borderRadius: "4px", marginTop: "16px" }}>
      <h4>{theme ? "Edit Custom Theme" : "Create Custom Theme"}</h4>
      
      <div style={{ marginBottom: "12px" }}>
        <label>Theme Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Custom Theme"
          style={{ width: "100%", padding: "8px", marginTop: "4px" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>Description:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description of your theme"
          style={{ width: "100%", padding: "8px", marginTop: "4px" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>Theme Type:</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LensTheme["type"])}
          style={{ width: "100%", padding: "8px", marginTop: "4px" }}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>Primary Color:</label>
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
          <input
            type="text"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#00a7a0"
            style={{ flex: 1, padding: "8px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label>Background Color:</label>
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
          <input
            type="text"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            placeholder="#1e2124"
            style={{ flex: 1, padding: "8px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label>Text Color:</label>
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
          />
          <input
            type="text"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            placeholder="#8e9297"
            style={{ flex: 1, padding: "8px" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <Button primary onClick={handleSave} disabled={!name.trim()}>
          {theme ? "Update Theme" : "Create Theme"}
        </Button>
        <Button outlined onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
});

const NonInjectedCustomThemeManager = observer(({ customThemesState, userState, defaultDarkTheme }: Dependencies) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | undefined>();

  const handleCreateNew = () => {
    setEditingTheme(undefined);
    setIsEditing(true);
  };

  const handleEdit = (theme: CustomTheme) => {
    setEditingTheme(theme);
    setIsEditing(true);
  };

  const handleSave = (themeData: Partial<CustomTheme>) => {
    if (editingTheme) {
      customThemesState.updateTheme(editingTheme.id, themeData);
    } else {
      const newTheme = customThemesState.addTheme(themeData as Omit<CustomTheme, "id" | "createdAt" | "updatedAt">);
      userState.colorTheme = newTheme.name;
    }
    setIsEditing(false);
    setEditingTheme(undefined);
  };

  const handleDelete = (id: string) => {
    const theme = customThemesState.getTheme(id);
    if (theme && userState.colorTheme === theme.name) {
      userState.colorTheme = "lens-dark";
    }
    customThemesState.deleteTheme(id);
  };

  const handleExport = (id: string) => {
    const json = customThemesState.exportTheme(id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freelens-theme-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="custom-themes" style={{ marginTop: "24px" }}>
      <SubTitle title="Custom Themes" />
      
      <div style={{ marginBottom: "16px" }}>
        <Button primary onClick={handleCreateNew}>
          Create New Theme
        </Button>
      </div>

      {customThemesState.themes.length > 0 && (
        <div className="custom-themes-list" style={{ marginBottom: "16px" }}>
          {customThemesState.themes.map((theme) => (
            <div
              key={theme.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                border: "1px solid var(--borderColor)",
                borderRadius: "4px",
                marginBottom: "8px",
                backgroundColor: userState.colorTheme === theme.name ? "var(--sidebarActiveColor)" : "transparent",
              }}
            >
              <div>
                <strong>{theme.name}</strong>
                <div style={{ fontSize: "12px", color: "var(--textColorSecondary)" }}>
                  {theme.description || "No description"} • {theme.type}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button outlined onClick={() => handleEdit(theme)}>
                  Edit
                </Button>
                <Button outlined onClick={() => handleExport(theme.id)}>
                  Export
                </Button>
                <Button outlined onClick={() => handleDelete(theme.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <ThemeEditor
          theme={editingTheme}
          onSave={handleSave}
          onCancel={() => {
            setIsEditing(false);
            setEditingTheme(undefined);
          }}
          defaultDarkTheme={defaultDarkTheme}
        />
      )}
    </section>
  );
});

export const CustomThemeManager = withInjectables<Dependencies>(NonInjectedCustomThemeManager, {
  getProps: (di) => ({
    customThemesState: di.inject(customThemesInjectable),
    userState: di.inject(userPreferencesStateInjectable),
    defaultDarkTheme: di.inject(lensDarkThemeInjectable),
  }),
});