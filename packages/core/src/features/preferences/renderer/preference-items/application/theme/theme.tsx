/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState } from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { lensThemeDeclarationInjectionToken } from "../../../../../../renderer/themes/declaration";
import defaultLensThemeInjectable from "../../../../../../renderer/themes/default-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import customThemeManagerInjectable from "./custom-theme-manager.injectable";
import { CustomThemeEditor } from "./custom-theme-editor";
import { ImportExportTheme } from "./import-export-theme";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { CustomThemeManager } from "./custom-theme-manager.injectable";

interface Dependencies {
  state: UserPreferencesState;
  defaultTheme: LensTheme;
  themes: LensTheme[];
  customThemeManager: CustomThemeManager;
}

const NonInjectedTheme = observer(({ state, themes, defaultTheme, customThemeManager }: Dependencies) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTheme, setEditingTheme] = useState<LensTheme | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentThemeName = state.colorTheme === "system" ? null : state.colorTheme;
  const currentTheme = themes.find((t) => t.name === currentThemeName);

  const themeOptions = [
    {
      value: "system",
      label: "Sync with computer",
    },
    ...themes.map((theme) => ({
      value: theme.name,
      label: `${theme.name}${theme.isCustom ? " (Custom)" : ""}`,
    })),
  ];

  const handleCreateTheme = () => {
    const baseTheme = currentTheme || defaultTheme;
    const baseName = `${baseTheme.name} Custom`;
    let themeName = baseName;
    let counter = 1;

    // Find a unique name
    while (themes.find((t) => t.name === themeName)) {
      themeName = `${baseName} ${counter}`;
      counter++;
    }

    const result = customThemeManager.createTheme(baseTheme, themeName);

    if (result.success && result.theme) {
      setEditingTheme(result.theme);
      setIsEditing(true);
      setSuccessMessage(`Theme "${themeName}" created successfully`);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.error || "Failed to create theme");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleEditTheme = () => {
    if (currentTheme && currentTheme.isCustom) {
      setEditingTheme(currentTheme);
      setIsEditing(true);
    }
  };

  const handleDuplicateTheme = () => {
    if (currentTheme) {
      const baseName = `${currentTheme.name} Copy`;
      let themeName = baseName;
      let counter = 1;

      while (themes.find((t) => t.name === themeName)) {
        themeName = `${baseName} ${counter}`;
        counter++;
      }

      const result = customThemeManager.duplicateTheme(currentTheme, themeName);

      if (result.success && result.theme) {
        state.colorTheme = result.theme.name;
        setSuccessMessage(`Theme duplicated as "${result.theme.name}"`);
        setErrorMessage(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(result.error || "Failed to duplicate theme");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  const handleDeleteTheme = () => {
    if (currentTheme && currentTheme.isCustom) {
      const confirmed = window.confirm(`Are you sure you want to delete the theme "${currentTheme.name}"?`);

      if (confirmed) {
        const result = customThemeManager.deleteTheme(currentTheme.name);

        if (result.success) {
          state.colorTheme = defaultTheme.name;
          setSuccessMessage(`Theme "${currentTheme.name}" deleted successfully`);
          setErrorMessage(null);
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          setErrorMessage(result.error || "Failed to delete theme");
          setTimeout(() => setErrorMessage(null), 5000);
        }
      }
    }
  };

  const handleSaveTheme = (updatedTheme: LensTheme) => {
    if (editingTheme) {
      const result = customThemeManager.updateTheme(editingTheme.name, updatedTheme);

      if (result.success) {
        state.colorTheme = updatedTheme.name;
        setIsEditing(false);
        setEditingTheme(null);
        setSuccessMessage(`Theme "${updatedTheme.name}" saved successfully`);
        setErrorMessage(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(result.error || "Failed to save theme");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTheme(null);
  };

  const handleImportSuccess = (theme: LensTheme) => {
    state.colorTheme = theme.name;
    setSuccessMessage(`Theme "${theme.name}" imported successfully`);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  if (isEditing && editingTheme) {
    return <CustomThemeEditor theme={editingTheme} onSave={handleSaveTheme} onCancel={handleCancelEdit} />;
  }

  return (
    <section id="appearance">
      <SubTitle title="Theme" />
      
      {errorMessage && (
        <div style={{ 
          padding: "12px", 
          marginBottom: "12px", 
          background: "var(--colorSoftError)", 
          color: "white", 
          borderRadius: "4px",
          fontSize: "13px"
        }}>
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{ 
          padding: "12px", 
          marginBottom: "12px", 
          background: "var(--colorSuccess)", 
          color: "white", 
          borderRadius: "4px",
          fontSize: "13px"
        }}>
          {successMessage}
        </div>
      )}

      <Select
        id="theme-input"
        options={themeOptions}
        value={state.colorTheme}
        onChange={(value) => (state.colorTheme = value?.value ?? defaultTheme.name)}
        themeName="lens"
      />

      <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
        <button
          onClick={handleCreateTheme}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            background: "var(--buttonPrimaryBackground)",
            color: "white",
            fontSize: "13px",
            cursor: "pointer",
          }}
          type="button"
        >
          Create Custom Theme
        </button>

        {currentTheme?.isCustom && (
          <>
            <button
              onClick={handleEditTheme}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                background: "var(--buttonDefaultBackground)",
                color: "var(--textColorAccent)",
                fontSize: "13px",
                cursor: "pointer",
              }}
              type="button"
            >
              Edit Theme
            </button>

            <button
              onClick={handleDeleteTheme}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                background: "var(--buttonAccentBackground)",
                color: "white",
                fontSize: "13px",
                cursor: "pointer",
              }}
              type="button"
            >
              Delete Theme
            </button>
          </>
        )}

        {currentTheme && (
          <button
            onClick={handleDuplicateTheme}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              background: "var(--buttonDefaultBackground)",
              color: "var(--textColorAccent)",
              fontSize: "13px",
              cursor: "pointer",
            }}
            type="button"
          >
            Duplicate Theme
          </button>
        )}
      </div>

      <ImportExportTheme
        currentTheme={currentTheme}
        onImportSuccess={handleImportSuccess}
        onError={handleError}
      />
    </section>
  );
});

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    defaultTheme: di.inject(defaultLensThemeInjectable),
    themes: di.injectMany(lensThemeDeclarationInjectionToken),
    customThemeManager: di.inject(customThemeManagerInjectable),
  }),
});
