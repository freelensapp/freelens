/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React, { useState, useMemo } from "react";
import { ColorPicker } from "@freelensapp/color-picker";
import customThemeManagerInjectable from "./custom-theme-manager.injectable";

import type { LensTheme, LensColorName } from "../../../../../../renderer/themes/lens-theme";
import type { CustomThemeManager } from "./custom-theme-manager.injectable";

import styles from "./custom-theme-editor.module.scss";

interface Dependencies {
  customThemeManager: CustomThemeManager;
}

interface CustomThemeEditorProps extends Dependencies {
  theme: LensTheme;
  onSave: (theme: LensTheme) => void;
  onCancel: () => void;
}

const colorCategories = {
  "General Colors": ["blue", "magenta", "golden", "halfGray", "primary"] as LensColorName[],
  "Text Colors": [
    "textColorPrimary",
    "textColorSecondary",
    "textColorTertiary",
    "textColorAccent",
    "textColorDimmed",
  ] as LensColorName[],
  "Border Colors": ["borderColor", "borderFaintColor"] as LensColorName[],
  "Background Colors": [
    "mainBackground",
    "secondaryBackground",
    "contentColor",
    "layoutBackground",
    "layoutTabsBackground",
  ] as LensColorName[],
  "Sidebar Colors": [
    "sidebarBackground",
    "sidebarLogoBackground",
    "sidebarActiveColor",
    "sidebarSubmenuActiveColor",
    "sidebarItemHoverBackground",
  ] as LensColorName[],
  "Button Colors": [
    "buttonPrimaryBackground",
    "buttonDefaultBackground",
    "buttonLightBackground",
    "buttonAccentBackground",
    "buttonDisabledBackground",
  ] as LensColorName[],
  "Status Colors": [
    "colorSuccess",
    "colorOk",
    "colorInfo",
    "colorError",
    "colorSoftError",
    "colorWarning",
    "colorVague",
    "colorTerminated",
  ] as LensColorName[],
  "Table Colors": [
    "tableBgcStripe",
    "tableBgcSelected",
    "tableHeaderBackground",
    "tableHeaderColor",
    "tableSelectedRowColor",
  ] as LensColorName[],
};

const NonInjectedCustomThemeEditor = observer(
  ({ theme, onSave, onCancel, customThemeManager }: CustomThemeEditorProps) => {
    const [editedTheme, setEditedTheme] = useState<LensTheme>({ ...theme });
    const [activeCategory, setActiveCategory] = useState<string>("General Colors");

    const handleColorChange = (colorName: LensColorName, newValue: string) => {
      setEditedTheme((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [colorName]: newValue,
        },
      }));
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setEditedTheme((prev) => ({
        ...prev,
        name: event.target.value,
      }));
    };

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditedTheme((prev) => ({
        ...prev,
        description: event.target.value,
      }));
    };

    const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      setEditedTheme((prev) => ({
        ...prev,
        type: event.target.value as "dark" | "light",
      }));
    };

    const handleSave = () => {
      onSave(editedTheme);
    };

    const currentCategoryColors = useMemo(
      () => colorCategories[activeCategory as keyof typeof colorCategories] || [],
      [activeCategory],
    );

    return (
      <div className={styles.editor}>
        <div className={styles.header}>
          <h3>Edit Theme: {theme.name}</h3>
        </div>

        <div className={styles.content}>
          <div className={styles.basicInfo}>
            <div className={styles.field}>
              <label>Theme Name</label>
              <input type="text" value={editedTheme.name} onChange={handleNameChange} className={styles.input} />
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <textarea
                value={editedTheme.description}
                onChange={handleDescriptionChange}
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label>Theme Type</label>
              <select value={editedTheme.type} onChange={handleTypeChange} className={styles.select}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>

          <div className={styles.colorEditor}>
            <div className={styles.categoryTabs}>
              {Object.keys(colorCategories).map((category) => (
                <button
                  key={category}
                  className={`${styles.categoryTab} ${activeCategory === category ? styles.active : ""}`}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>

            <div className={styles.colorGrid}>
              {currentCategoryColors.map((colorName) => (
                <ColorPicker
                  key={colorName}
                  label={colorName}
                  value={editedTheme.colors[colorName]}
                  onChange={(newColor) => handleColorChange(colorName, newColor)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onCancel} className={styles.cancelButton} type="button">
            Cancel
          </button>
          <button onClick={handleSave} className={styles.saveButton} type="button">
            Save Theme
          </button>
        </div>
      </div>
    );
  },
);

export const CustomThemeEditor = withInjectables<Dependencies, CustomThemeEditorProps>(
  NonInjectedCustomThemeEditor,
  {
    getProps: (di, props) => ({
      ...props,
      customThemeManager: di.inject(customThemeManagerInjectable),
    }),
  },
);
